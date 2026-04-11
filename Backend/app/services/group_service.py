from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.repositories import GroupRepository
from fastapi import HTTPException
from app.models import Group, GroupMember
from app.schemas import GroupCreate, GroupUpdate
from app.enums import GroupStatus, GroupMemberRole, GroupMemberStatus

GROUP_NAME_MAX_LENGTH = 120
GROUP_DESCRIPTION_MAX_LENGTH = 500


class GroupService:
    def __init__(self, db: Session):
        self.group_repo = GroupRepository(db)


    def get_group(self, group_id: int, user_id: int) -> Group | None:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        if not self.group_repo.get_membership(group_id, user_id):
            raise HTTPException(status_code=403, detail="Not authorized")

        members_count, expenses_count = self.group_repo.get_counts_for_group(group_id)
        group.members_count = members_count
        group.expenses_count = expenses_count

        return group


    def get_all_groups(self, user_id) -> list[Group]:
        return self.group_repo.get_all_by_user_id(user_id)


    def create_group(self, group_in: GroupCreate, user_id: int) -> Group:
        normalized_name = group_in.name.strip()
        normalized_description = group_in.description.strip() if group_in.description else None

        if not normalized_name:
            raise HTTPException(status_code=400, detail="Group name cannot be empty")

        if len(normalized_name) > GROUP_NAME_MAX_LENGTH:
            raise HTTPException(status_code=400, detail="Group name is too long")

        if normalized_description is not None and len(normalized_description) > GROUP_DESCRIPTION_MAX_LENGTH:
            raise HTTPException(status_code=400, detail="Group description is too long")

        if self.group_repo.exists_active_name_for_user(user_id, normalized_name):
            raise HTTPException(status_code=400, detail="You already have an active group with this name")

        try:       
            new_group = Group(
                name=normalized_name,
                description=normalized_description,
                status=GroupStatus.ACTIVE,
                currency=group_in.currency,
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
            raise HTTPException(status_code=400, detail="You already have an active group with this name")
        

    def get_all_members(self, group_id: int, user_id: int) -> list[GroupMember]:
        group = self.get_group(group_id, user_id)

        return self.group_repo.get_all_members(group.id)
    

    def get_member(self, group_id, user_id) -> GroupMember | None:
        member = self.group_repo.get_membership(group_id, user_id)
        if member is None:
            raise HTTPException(status_code=404, detail="Member not found")
        return member


    def _require_admin(self, group_id: int, user_id: int) -> GroupMember:
        member = self.get_member(group_id, user_id)
        if member.role != GroupMemberRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized admin role required")
        return member


    def _prepare_admin_reassignment_if_needed(self, group_id: int, member: GroupMember):
        if member.role != GroupMemberRole.ADMIN:
            return

        active_admins = self.group_repo.get_active_admin_members(group_id)
        is_last_admin = len(active_admins) == 1 and active_admins[0].user_id == member.user_id

        if not is_last_admin:
            return

        replacement = self.group_repo.get_oldest_active_member_except(group_id, member.user_id)
        if replacement is None:
            raise HTTPException(status_code=400, detail="Cannot remove the last group member")

        replacement.role = GroupMemberRole.ADMIN
        

    def grant_admin_role(self, group_id: int, user_id: int, current_admin_id: int) -> GroupMember:
        if user_id == current_admin_id:
            raise HTTPException(status_code=400, detail="Cannot grant role to yourself")

        group = self.get_group(group_id, current_admin_id)

        self._require_admin(group.id, current_admin_id)

        new_admin = self.get_member(group.id, user_id)
        
        new_admin.role = GroupMemberRole.ADMIN

        self.group_repo.save_all()

        return new_admin


    def remove_member(self, group_id: int, user_id: int, current_admin_id: int):
        if user_id == current_admin_id:
            raise HTTPException(status_code=400, detail="Use leave endpoint to leave group")

        group = self.get_group(group_id, current_admin_id)

        self._require_admin(group.id, current_admin_id)

        member_to_remove = self.get_member(group.id, user_id)

        self._prepare_admin_reassignment_if_needed(group.id, member_to_remove)

        self.group_repo.delete_member(member_to_remove)
        self.group_repo.save_all()


    def leave_group(self, group_id: int, user_id: int):
        group = self.get_group(group_id, user_id)

        current_member = self.get_member(group.id, user_id)
        replacement = self.group_repo.get_oldest_active_member_except(group.id, current_member.user_id)

        if replacement is None:
            # If user is the last active member, leaving archives the group.
            group.status = GroupStatus.ARCHIVED
        elif current_member.role == GroupMemberRole.ADMIN:
            replacement.role = GroupMemberRole.ADMIN

        self.group_repo.delete_member(current_member)
        self.group_repo.save_all()


    def update_group(self, group_id: int, group_in: GroupUpdate, user_id: int) -> Group:
        group = self.get_group(group_id, user_id)

        self._require_admin(group.id, user_id)

        update_data = group_in.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] is not None:
            update_data["name"] = update_data["name"].strip()
            if not update_data["name"]:
                raise HTTPException(status_code=400, detail="Group name cannot be empty")
            if len(update_data["name"]) > GROUP_NAME_MAX_LENGTH:
                raise HTTPException(status_code=400, detail="Group name is too long")

        if "description" in update_data and update_data["description"] is not None:
            update_data["description"] = update_data["description"].strip()
            if len(update_data["description"]) > GROUP_DESCRIPTION_MAX_LENGTH:
                raise HTTPException(status_code=400, detail="Group description is too long")

        candidate_name = update_data.get("name", group.name)
        candidate_status = update_data.get("status", group.status)
        if candidate_status == GroupStatus.ACTIVE and self.group_repo.exists_active_name_for_user(
            user_id,
            candidate_name,
            exclude_group_id=group.id,
        ):
            raise HTTPException(status_code=400, detail="You already have an active group with this name")

        if "currency" in update_data and update_data["currency"] is not None:
            if update_data["currency"] != group.currency and self.group_repo.has_any_expenses(group.id):
                raise HTTPException(status_code=400, detail="Cannot change group currency when group has expenses")

        for field, value in update_data.items():
            setattr(group, field, value)

        try:
            self.group_repo.save_all()
            self.group_repo.refresh(group)
            return group
        except IntegrityError:
            self.group_repo.db.rollback()
            raise HTTPException(status_code=400, detail="You already have an active group with this name")