from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import Group, GroupMember


class GroupRepository:
    def __init__(self, db: Session):
        self.db = db


    def create_group_with_creator(self, group: Group, member: GroupMember):
        try:
            member.group = group

            self.db.add(group)
            self.db.add(member)

            self.db.commit()
            self.db.refresh(group)

            return group

        except IntegrityError as e:
            self.db.rollback()
            raise e


    def get_membership(self, group_id: int, user_id: int) -> GroupMember | None:
        return (
            self.db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id
            )
            .first()
        )
    

    def get_by_id(self, group_id: int) -> Group | None:
        return self.db.query(Group).filter(Group.id == group_id).first()
    
    
    def get_all_by_user_id(self, user_id: int) -> list[Group]:
        return (
            self.db.query(Group)
            .join(GroupMember, Group.id == GroupMember.group_id)
            .filter(GroupMember.user_id == user_id)
            .all()
        )


   # -- inne reliktowe pozostałości vibecodingu narazie bez zastosowania

    # def create(self, group: Group) -> Group:
    #     self.db.add(group)
    #     self.db.commit()
    #     self.db.refresh(group)
    #     return group
    

    # def get_all(self) -> list[Group]:
    #     return self.db.query(Group).all()
    
    
    # def update(self, group_id: int, new_data: dict) -> Group | None:
    #     group = self.get_by_id(group_id)
    #     if not group:
    #         return None
    #     for key, value in new_data.items():
    #         setattr(group, key, value)
    #     self.db.commit()
    #     self.db.refresh(group)
    #     return group


    # def delete(self, group_id: int) -> bool:
    #     group = self.get_by_id(group_id)
    #     if not group:
    #         return False
    #     self.db.delete(group)
    #     self.db.commit()
    #     return True


    # def get_groups_by_user(self, user_id: int) -> list[Group]:
    #     return (
    #         self.db.query(Group)
    #         .join(GroupMember)
    #         .filter(GroupMember.user_id == user_id)
    #         .all()
    #     )
    

    # def count_user_groups(self, user_id: int) -> int:
    #     return (
    #         self.db.query(GroupMember)
    #         .filter(GroupMember.user_id == user_id)
    #         .count()
    #     )
