from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from app.models import Group, GroupMember
from app.models import Expense
from app.enums import GroupMemberRole, GroupMemberStatus, GroupStatus


class GroupRepository:
    def __init__(self, db: Session):
        self.db = db


    def create_group_with_creator(self, group: Group, member: GroupMember):
        member.group = group

        self.db.add(group)
        self.db.add(member)
        self.db.flush()

        return group


    def get_by_id(self, group_id: int) -> Group | None:
        return self.db.query(Group).filter(Group.id == group_id).first()
    
    
    def get_all_by_user_id(self, user_id: int) -> list[Group]:
        return (
            self.db.query(Group)
            .join(GroupMember, Group.id == GroupMember.group_id)
            .filter(GroupMember.user_id == user_id)
            .all()
        )


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


    def get_membership(self, group_id: int, user_id: int) -> GroupMember | None:
        return (
            self.db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id
            )
            .first()
        )
    

    def add_member(self, group_id: int, user_id: int):
        membership = GroupMember(
            user_id=user_id,
            group_id=group_id
        )
        self.db.add(membership)
        self.db.flush()


    def delete_member(self, member: GroupMember):
        self.db.delete(member)
        self.db.flush()


    def get_all_members(self, group_id: int) -> list[GroupMember]:
        return (
            self.db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.status == GroupMemberStatus.ACTIVE,
            )
            .options(selectinload(GroupMember.user))
            .all()
        )


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
    