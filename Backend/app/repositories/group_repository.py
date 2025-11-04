from sqlalchemy.orm import Session
from app.models import Group, GroupMember


class GroupRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, group: Group) -> Group:
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)
        return group
    

    def get_by_id(self, group_id: int) -> Group | None:
        return self.db.query(Group).filter(Group.id == group_id).first()


    def get_all(self) -> list[Group]:
        return self.db.query(Group).all()
    
    
    def update(self, group_id: int, new_data: dict) -> Group | None:
        group = self.get_by_id(group_id)
        if not group:
            return None
        for key, value in new_data.items():
            setattr(group, key, value)
        self.db.commit()
        self.db.refresh(group)
        return group


    def delete(self, group_id: int) -> bool:
        group = self.get_by_id(group_id)
        if not group:
            return False
        self.db.delete(group)
        self.db.commit()
        return True


    def get_groups_by_user(self, user_id: int) -> list[Group]:
        return (
            self.db.query(Group)
            .join(GroupMember)
            .filter(GroupMember.user_id == user_id)
            .all()
        )
