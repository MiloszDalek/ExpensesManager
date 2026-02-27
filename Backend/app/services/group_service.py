from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.repositories import GroupRepository, GroupMemberRepository
from fastapi import HTTPException
from app.models import Group, GroupMember
from app.schemas import GroupCreate, GroupUpdate
from app.enums import GroupStatus, GroupMemberRole, GroupMemberStatus


class GroupService:
    def __init__(self, db: Session):
        self.group_repo = GroupRepository(db)
        self.member_repo = GroupMemberRepository(db)


    def create_group(self, group_in: GroupCreate, user_id: int) -> Group:
        new_group = Group(
            name=group_in.name.strip().lower(),
            description=group_in.description,
            status=GroupStatus.ACTIVE,
            created_by=user_id
        )

        member = GroupMember(
            user_id=user_id,
            role=GroupMemberRole.ADMIN,
            status=GroupMemberStatus.ACTIVE
        )

        try:
            return self.group_repo.create_group_with_creator(new_group, member)
        except IntegrityError:
            raise HTTPException(status_code=400, detail="You have already created a group with this name")
        


    # -- inne reliktowe pozostałości vibecodingu narazie bez zastosowania

    # def create_group(self, data: GroupCreate, owner_id: int) -> Group:
    #     group = Group(**data.model_dump(), created_by=owner_id)
    #     group = self.group_repo.create(group)
        
    #     self.member_repo.add_member(group.id, owner_id)
    #     return group


    # def get_group(self, group_id: int) -> Group:
    #     group = self.group_repo.get_by_id(group_id)
    #     if not group:
    #         raise HTTPException(status_code=404, detail="Group not found")
    #     return group


    # def list_user_groups(self, user_id: int) -> list[Group]:
    #     return self.group_repo.get_groups_by_user(user_id)


    # def update_group(self, group_id: int, new_data: GroupUpdate) -> Group:
    #     group = self.group_repo.update(group_id, new_data)
    #     if not group:
    #         raise HTTPException(status_code=404, detail="Group not found")
    #     return group


    # def delete_group(self, group_id: int):
    #     deleted = self.group_repo.delete(group_id)
    #     if not deleted:
    #         raise HTTPException(status_code=404, detail="Group not found")
    #     return True


    # def add_member(self, group_id: int, user_id: int):
    #     if self.member_repo.is_user_in_group(group_id, user_id):
    #         raise HTTPException(status_code=409, detail="User already in group")
    #     return self.member_repo.add_member(group_id, user_id)


    # def remove_member(self, group_id: int, user_id: int):
    #     if not self.member_repo.is_user_in_group(group_id, user_id):
    #         raise HTTPException(status_code=404, detail="User not found in group")
    #     self.member_repo.remove_member(group_id, user_id)
    #     return True


    # def get_members(self, group_id: int):
    #     group = self.group_repo.get_by_id(group_id)
    #     if not group:
    #         raise HTTPException(status_code=404, detail="Group not found")
    #     return self.member_repo.get_members_by_group(group_id)