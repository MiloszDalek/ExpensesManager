from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session
from app.enums import GroupMemberStatus, SystemUserRole
from app.models import Expense, GroupMember, Invitation, Settlement, User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    
    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()


    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()


    def get_by_role(self, role: SystemUserRole) -> User | None:
        return (
            self.db.query(User)
            .filter(User.role == role)
            .order_by(User.created_at.asc(), User.id.asc())
            .first()
        )


    def get_all_by_role(self, role: SystemUserRole) -> list[User]:
        return (
            self.db.query(User)
            .filter(User.role == role)
            .order_by(User.created_at.asc(), User.id.asc())
            .all()
        )


    def get_all(self) -> list[User]:
        return self.db.query(User).all()


    def get_all_with_activity(
        self,
        search: str | None = None,
        role: SystemUserRole | None = None,
        is_active: bool | None = None,
    ):
        group_counts_sq = (
            self.db.query(
                GroupMember.user_id.label("user_id"),
                func.count(GroupMember.group_id).label("groups_count"),
            )
            .filter(GroupMember.status == GroupMemberStatus.ACTIVE)
            .group_by(GroupMember.user_id)
            .subquery()
        )

        expense_counts_sq = (
            self.db.query(
                Expense.user_id.label("user_id"),
                func.count(Expense.id).label("expenses_count"),
                func.max(Expense.created_at).label("last_expense_at"),
            )
            .group_by(Expense.user_id)
            .subquery()
        )

        invitation_counts_sq = (
            self.db.query(
                Invitation.from_user_id.label("user_id"),
                func.count(Invitation.id).label("sent_invitations_count"),
                func.max(Invitation.created_at).label("last_invitation_at"),
            )
            .group_by(Invitation.from_user_id)
            .subquery()
        )

        settlement_counts_sq = (
            self.db.query(
                Settlement.from_user_id.label("user_id"),
                func.count(Settlement.id).label("settlements_count"),
                func.max(Settlement.created_at).label("last_settlement_at"),
            )
            .group_by(Settlement.from_user_id)
            .subquery()
        )

        query = (
            self.db.query(
                User,
                func.coalesce(group_counts_sq.c.groups_count, 0).label("groups_count"),
                func.coalesce(expense_counts_sq.c.expenses_count, 0).label("expenses_count"),
                func.coalesce(
                    invitation_counts_sq.c.sent_invitations_count,
                    0,
                ).label("sent_invitations_count"),
                func.coalesce(settlement_counts_sq.c.settlements_count, 0).label("settlements_count"),
                expense_counts_sq.c.last_expense_at.label("last_expense_at"),
                invitation_counts_sq.c.last_invitation_at.label("last_invitation_at"),
                settlement_counts_sq.c.last_settlement_at.label("last_settlement_at"),
            )
            .outerjoin(group_counts_sq, group_counts_sq.c.user_id == User.id)
            .outerjoin(expense_counts_sq, expense_counts_sq.c.user_id == User.id)
            .outerjoin(invitation_counts_sq, invitation_counts_sq.c.user_id == User.id)
            .outerjoin(settlement_counts_sq, settlement_counts_sq.c.user_id == User.id)
        )

        if search and search.strip():
            normalized_search = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.email.ilike(normalized_search),
                    User.username.ilike(normalized_search),
                )
            )

        if role is not None:
            query = query.filter(User.role == role)

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.order_by(User.created_at.desc()).all()


    def get_activity_stats(
        self,
        search: str | None = None,
        role: SystemUserRole | None = None,
        is_active: bool | None = None,
    ):
        query = self.db.query(
            func.count(User.id).label("total_users"),
            func.sum(case((User.is_active.is_(True), 1), else_=0)).label("active_users"),
            func.sum(case((User.is_active.is_(False), 1), else_=0)).label("inactive_users"),
        )

        if search and search.strip():
            normalized_search = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.email.ilike(normalized_search),
                    User.username.ilike(normalized_search),
                )
            )

        if role is not None:
            query = query.filter(User.role == role)

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.one()


    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user


    def save(self, user: User):
        self.db.add(user)
        self.db.flush()


    def save_all(self):
        self.db.commit()


    def rollback(self):
        self.db.rollback()


    def refresh(self, user: User):
        self.db.refresh(user)


    def delete(self, user: User):
        self.db.delete(user)
        self.db.commit()
