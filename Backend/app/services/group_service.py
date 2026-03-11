from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.repositories import GroupRepository
from fastapi import HTTPException
from app.models import Group, GroupMember
from app.schemas import GroupCreate, GroupUpdate
from app.enums import GroupStatus, GroupMemberRole, GroupMemberStatus


class GroupService:
    def __init__(self, db: Session):
        self.group_repo = GroupRepository(db)


    def get_group(self, group_id: int, user_id: int) -> Group | None:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        if not self.group_repo.get_membership(group_id, user_id):
            raise HTTPException(status_code=403, detail="Not authorized")

        return group


    def get_all_groups(self, user_id) -> list[Group]:
        return self.group_repo.get_all_by_user_id(user_id)


    def create_group(self, group_in: GroupCreate, user_id: int) -> Group:
        try:       
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

            group = self.group_repo.create_group_with_creator(new_group, member)
            self.group_repo.save_all()
            return group
        
        except IntegrityError:
            self.group_repo.db.rollback()
            raise HTTPException(status_code=400, detail="You have already created a group with this name")
        

    def get_all_members(self, group_id: int, user_id: int) -> list[GroupMember]:
        group = self.get_group(group_id, user_id)

        return self.group_repo.get_all_members(group.id)
    

    def get_member(self, group_id, user_id) -> GroupMember | None:
        return self.group_repo.get_membership(group_id, user_id)
        

    def grant_admin_role(self, group_id: int, user_id: int, current_admin_id: int) -> GroupMember:
        if user_id == current_admin_id:
            raise HTTPException(status_code=400, detail="Cannot grant role to yourself")

        group = self.get_group(group_id, current_admin_id)

        if self.get_member(group.id, current_admin_id).role != GroupMemberRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized admin role required")

        new_admin = self.get_member(group.id, user_id)

        if not new_admin:
            raise HTTPException(status_code=404, detail="Member not found")
        
        new_admin.role = GroupMemberRole.ADMIN

        self.group_repo.save_all()

        return new_admin