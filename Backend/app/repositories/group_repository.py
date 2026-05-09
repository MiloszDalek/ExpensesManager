from decimal import Decimal
from sqlalchemy import func, select, literal_column, select
from sqlalchemy.orm import Session, selectinload, aliased
from sqlalchemy.exc import IntegrityError
from app.models import Group, GroupMember
from app.models import Expense
from app.enums import GroupMemberRole, GroupMemberStatus, GroupStatus


class GroupRepository:
    def __init__(self, db: Session):
        self.db = db


    def _group_members_count_subquery(self):
        return (
            select(func.count(GroupMember.id))
            .where(
                GroupMember.group_id == Group.id,
                GroupMember.status == GroupMemberStatus.ACTIVE,
            )
            .correlate(Group)
            .scalar_subquery()
        )


    def _group_expenses_count_subquery(self):
        return (
            select(func.count(Expense.id))
            .where(Expense.group_id == Group.id)
            .correlate(Group)
            .scalar_subquery()
        )


    def _group_total_amount_subquery(self):
        return (
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(Expense.group_id == Group.id)
            .correlate(Group)
            .scalar_subquery()
        )


    def create_group_with_creator(self, group: Group, member: GroupMember):
        member.group = group

        self.db.add(group)
        self.db.add(member)
        self.db.flush()

        return group


    def get_by_id(self, group_id: int) -> Group | None:
        return self.db.query(Group).filter(Group.id == group_id).first()


    def get_by_ids(self, group_ids: list[int]) -> list[Group]:
        if not group_ids:
            return []

        return self.db.query(Group).filter(Group.id.in_(group_ids)).all()
    
    
    def get_all_by_user_id(self, user_id: int) -> list[Group]:
        membership_filter = aliased(GroupMember)
        members_count = self._group_members_count_subquery()
        expenses_count = self._group_expenses_count_subquery()
        total_amount = self._group_total_amount_subquery()

        rows = (
            self.db.query(
                Group,
                members_count.label("members_count"),
                expenses_count.label("expenses_count"),
                total_amount.label("total_amount"),
            )
            .join(
                membership_filter,
                Group.id == membership_filter.group_id,
            )
            .filter(
                membership_filter.user_id == user_id,
                membership_filter.status == GroupMemberStatus.ACTIVE,
            )
            .all()
        )

        groups: list[Group] = []
        for group, members_count_value, expenses_count_value, total_amount_value in rows:
            group.members_count = int(members_count_value or 0)
            group.expenses_count = int(expenses_count_value or 0)
            group.total_amount = total_amount_value if total_amount_value is not None else Decimal("0")
            groups.append(group)

        return groups


    def exists_active_name_for_user(self, user_id: int, name: str, exclude_group_id: int | None = None) -> bool:
        query = self.db.query(Group.id).filter(
            Group.created_by == user_id,
            Group.name == name,
            Group.status == GroupStatus.ACTIVE,
        )

        if exclude_group_id is not None:
            query = query.filter(Group.id != exclude_group_id)

        return query.first() is not None


    def save_all(self):
        self.db.commit()

        
    def refresh(self, group: Group):
        self.db.refresh(group)


    def get_membership(self, group_id: int, user_id: int, include_left: bool = False) -> GroupMember | None:
        query = self.db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )

        if not include_left:
            query = query.filter(GroupMember.status == GroupMemberStatus.ACTIVE)

        return query.first()
    

    def add_member(self, group_id: int, user_id: int):
        membership = self.get_membership(group_id, user_id, include_left=True)
        if membership is not None:
            membership.status = GroupMemberStatus.ACTIVE
            membership.role = GroupMemberRole.MEMBER
            membership.joined_at = func.now()
            self.db.flush()
            return membership

        membership = GroupMember(
            user_id=user_id,
            group_id=group_id,
            status=GroupMemberStatus.ACTIVE,
        )
        self.db.add(membership)
        self.db.flush()
        return membership


    def delete_member(self, member: GroupMember):
        member.status = GroupMemberStatus.LEFT
        self.db.flush()


    def get_all_members(self, group_id: int, include_left: bool = False) -> list[GroupMember]:
        query = self.db.query(GroupMember).filter(GroupMember.group_id == group_id)

        if not include_left:
            query = query.filter(GroupMember.status == GroupMemberStatus.ACTIVE)

        return query.options(selectinload(GroupMember.user)).all()


    def get_active_admin_members(self, group_id: int) -> list[GroupMember]:
        return (
            self.db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.status == GroupMemberStatus.ACTIVE,
                GroupMember.role == GroupMemberRole.ADMIN,
            )
            .order_by(GroupMember.joined_at.asc(), GroupMember.id.asc())
            .all()
        )


    def get_oldest_active_member_except(self, group_id: int, excluded_user_id: int) -> GroupMember | None:
        return (
            self.db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.status == GroupMemberStatus.ACTIVE,
                GroupMember.user_id != excluded_user_id,
            )
            .order_by(GroupMember.joined_at.asc(), GroupMember.id.asc())
            .first()
        )


    def has_any_expenses(self, group_id: int) -> bool:
        return (
            self.db.query(Expense.id)
            .filter(Expense.group_id == group_id)
            .limit(1)
            .first()
            is not None
        )


    def get_spending_trend(self, group_id: int, interval: str) -> list[dict]:
        if interval == "daily":
            start = func.date_trunc("day", func.now() - literal_column("INTERVAL '30 days'"))
            end = func.date_trunc("day", func.now())
            step = literal_column("INTERVAL '1 day'")
            trunc_expr = func.date_trunc("day", Expense.expense_date)
            since_interval = "INTERVAL '30 days'"
            label_expr = func.to_char(trunc_expr, "YYYY-MM-DD")
        elif interval == "weekly":
            start = func.date_trunc("week", func.now() - literal_column("INTERVAL '12 weeks'"))
            end = func.date_trunc("week", func.now())
            step = literal_column("INTERVAL '1 week'")
            trunc_expr = func.date_trunc("week", Expense.expense_date)
            since_interval = "INTERVAL '12 weeks'"
            label_expr = func.to_char(func.min(Expense.expense_date), 'IYYY"-W"IW')
        else:  # monthly
            start = func.date_trunc("month", func.now() - literal_column("INTERVAL '6 months'"))
            end = func.date_trunc("month", func.now())
            step = literal_column("INTERVAL '1 month'")
            trunc_expr = func.date_trunc("month", Expense.expense_date)
            since_interval = "INTERVAL '6 months'"
            label_expr = func.to_char(trunc_expr, "YYYY-MM")

        # Generate series of all periods in the range
        series_cte = (
            select(func.generate_series(start, end, step).label("period"))
            .cte("series")
        )
        series = aliased(series_cte)

        # Aggregate expenses by period
        since = func.now() - literal_column(since_interval)
        expense_agg = (
            select(
                trunc_expr.label("period"),
                func.coalesce(func.sum(Expense.amount), 0).label("amount"),
            )
            .filter(
                Expense.group_id == group_id,
                Expense.expense_date >= since,
            )
            .group_by(trunc_expr)
            .cte("expense_agg")
        )
        agg = aliased(expense_agg)

        # Left join series with expenses to include zero-amount periods
        if interval == "weekly":
            label_expr = func.to_char(series.c.period, 'IYYY"-W"IW')
        elif interval == "monthly":
            label_expr = func.to_char(series.c.period, "YYYY-MM")
        else:
            label_expr = func.to_char(series.c.period, "YYYY-MM-DD")

        rows = (
            self.db.query(
                label_expr.label("label"),
                func.coalesce(agg.c.amount, 0).label("amount"),
            )
            .select_from(series)
            .outerjoin(agg, series.c.period == agg.c.period)
            .order_by(series.c.period.asc())
            .all()
        )

        return [{"label": row.label, "amount": row.amount} for row in rows]


    def get_counts_for_group(self, group_id: int) -> tuple[int, int, Decimal]:
        members_count = (
            self.db.query(func.count(GroupMember.id))
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.status == GroupMemberStatus.ACTIVE,
            )
            .scalar()
            or 0
        )

        expenses_count = (
            self.db.query(func.count(Expense.id))
            .filter(Expense.group_id == group_id)
            .scalar()
            or 0
        )

        total_amount = (
            self.db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(Expense.group_id == group_id)
            .scalar()
            or Decimal("0")
        )

        return int(members_count), int(expenses_count), Decimal(str(total_amount))
    