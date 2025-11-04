from sqlalchemy.orm import Session
from app.models import GroupMember


class GroupMemberRepository:
    def __init__(self, db: Session):
        self.db = db


    def add_member(self, group_id: int, user_id: int) -> GroupMember:
        member = GroupMember(group_id=group_id, user_id=user_id)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member


    def remove_member(self, group_id: int, user_id: int):
        self.db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).delete()
        self.db.commit()


    def get_members_by_group(self, group_id: int) -> list[GroupMember]:
        return self.db.query(GroupMember).filter(GroupMember.group_id == group_id).all()


    def is_user_in_group(self, group_id: int, user_id: int) -> bool:
        return (
            self.db.query(GroupMember)
            .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
            .first()
            is not None
        )
