from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timezone
from app.repositories import InvitationRepository
from .notification_service import NotificationService
from .user_service import UserService
from .group_service import GroupService
from .contact_service import ContactService
from app.models import Invitation
from app.enums import InvitationType, InvitationStatus, NotificationType, GroupMemberRole
from app.schemas import ContactInvitationCreate, GroupInvitationCreate
import logging

logger = logging.getLogger(__name__)


class InvitationService:
    def __init__(self, db: Session):
        self.invitation_repo = InvitationRepository(db)
        self.contact_service = ContactService(db)
        self.notification_serivce = NotificationService(db)
        self.user_service = UserService(db)
        self.group_service = GroupService(db)


    def _resolve_group_invitation_target(self, invitation_in: GroupInvitationCreate):
        if invitation_in.to_user_id is not None and invitation_in.to_user_email is not None:
            raise HTTPException(status_code=400, detail="Provide only one target: to_user_id or to_user_email")

        if invitation_in.to_user_id is not None:
            return self.user_service.get_user(invitation_in.to_user_id)

        if invitation_in.to_user_email is not None:
            return self.user_service.get_user_by_email(str(invitation_in.to_user_email))

        raise HTTPException(status_code=400, detail="Missing invitation target")


    def _resolve_contact_invitation_target(self, invitation_in: ContactInvitationCreate):
        if invitation_in.to_user_id is not None and invitation_in.to_user_email is not None:
            raise HTTPException(status_code=400, detail="Provide only one target: to_user_id or to_user_email")

        if invitation_in.to_user_id is not None:
            return self.user_service.get_user(invitation_in.to_user_id)

        if invitation_in.to_user_email is not None:
            return self.user_service.get_user_by_email(str(invitation_in.to_user_email))

        raise HTTPException(status_code=400, detail="Missing invitation target")

    
    def send_invitation_to_contacts(self, invitation_in: ContactInvitationCreate, from_user_id: int) -> Invitation:
        to_user = self._resolve_contact_invitation_target(invitation_in)

        if from_user_id == to_user.id:
            raise HTTPException(status_code=400, detail="Cannot invite yourself")
        
        if self.contact_service.exists_between(from_user_id, to_user.id):
            raise HTTPException(status_code=400, detail="Contact already exist")
        
        try:
            invitation = self.invitation_repo.get_contact_invitation_between(from_user_id, to_user.id)

            if invitation:
                if invitation.status == InvitationStatus.PENDING:
                    raise HTTPException(
                        status_code=400,
                        detail="Invitation is already pending. Wait for response or cancel the existing invitation.",
                    )
                elif invitation.status == InvitationStatus.ACCEPTED:
                    raise HTTPException(status_code=400, detail="Invitation already accepted")
                
                invitation.status = InvitationStatus.PENDING
                invitation.responded_at = None
                invitation.created_at = datetime.now(timezone.utc)
            else:
                invitation = Invitation(
                    type=InvitationType.CONTACT,
                    from_user_id=from_user_id,
                    to_user_id=to_user.id,
                    group_id=None,
                )

                self.invitation_repo.create(invitation)

            self.notification_serivce.create_notification(
                user_id=to_user.id,
                type=NotificationType.INVITATION,
                reference_id=invitation.id,
                message="You received a new invitation",
                action_url="/contacts"
            )

            self.invitation_repo.save_all()

            self.invitation_repo.refresh(invitation)

            return invitation
        
        except Exception as e:
            self.invitation_repo.db.rollback()
            raise e
        

    def send_invitation_to_group(self, invitation_in: GroupInvitationCreate, from_user_id: int) -> Invitation:
        to_user = self._resolve_group_invitation_target(invitation_in)

        if from_user_id == to_user.id:
            raise HTTPException(status_code=400, detail="Cannot invite yourself")

        group = self.group_service.get_group(invitation_in.group_id, from_user_id)

        membership = self.group_service.group_repo.get_membership(group.id, to_user.id)

        if membership:
            raise HTTPException(status_code=400, detail="User already in group")
        
        try:
            invitation = self.invitation_repo.get_group_invitation(group.id, to_user.id)

            if invitation:
                if invitation.status == InvitationStatus.PENDING:
                    raise HTTPException(
                        status_code=400,
                        detail="Group invitation is already pending. Wait for response or cancel the existing invitation.",
                    )
                elif invitation.status == InvitationStatus.ACCEPTED:
                    # Recovery path for historical inconsistent data where invitation
                    # is accepted but membership was never created.
                    if self.group_service.group_repo.get_membership(group.id, to_user.id):
                        raise HTTPException(status_code=400, detail="Invitation already accepted")
                
                invitation.status = InvitationStatus.PENDING
                invitation.responded_at = None
                invitation.created_at = datetime.now(timezone.utc)
            else:
                invitation = Invitation(
                    type=InvitationType.GROUP,
                    from_user_id=from_user_id,
                    to_user_id=to_user.id,
                    group_id=group.id,
                )
                self.invitation_repo.create(invitation)
            
            
            self.notification_serivce.create_notification(
                user_id=to_user.id,
                type=NotificationType.INVITATION,
                reference_id=invitation.id,
                message="You received a new invitation to group",
                action_url="/groups"
            )
                
            self.invitation_repo.save_all()

            self.invitation_repo.refresh(invitation)

            return invitation

        except Exception as e:
            self.invitation_repo.db.rollback()
            raise e


    def get_pending_invitations_for_user(self, user_id: int, limit: int, offset: int) -> list[Invitation]:
        return self.invitation_repo.get_pending_for_recipient(user_id, limit, offset)


    def get_sent_invitations_for_user(
        self,
        user_id: int,
        limit: int,
        offset: int,
        invitation_type: InvitationType | None = None,
        invitation_status: InvitationStatus | None = None,
        include_archived: bool = False,
    ) -> list[Invitation]:
        return self.invitation_repo.get_sent_by_sender(
            user_id=user_id,
            limit=limit,
            offset=offset,
            invitation_type=invitation_type,
            invitation_status=invitation_status,
            include_archived=include_archived,
        )


    def get_group_pending_invitations(self, group_id: int, user_id: int, limit: int, offset: int) -> list[Invitation]:
        group = self.group_service.get_group(group_id, user_id)
        current_member = self.group_service.get_member(group.id, user_id)

        if current_member.role != GroupMemberRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized admin role required")

        return self.invitation_repo.get_group_pending(group.id, limit, offset)


    def accept_invitation(self, invitation_id: int, user_id: int):
        invitation = self.invitation_repo.get_by_id(invitation_id)

        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        if invitation.to_user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending invitation can be accepted")
        
        if invitation.type == InvitationType.CONTACT:
            self.accept_contact(invitation)

        elif invitation.type == InvitationType.GROUP:
            self.accept_group(invitation)

        return invitation


    def decline_invitation(self, invitation_id: int, user_id: int):
        invitation = self.invitation_repo.get_by_id(invitation_id)

        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        if invitation.to_user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending invitation can be declined")

        invitation.status = InvitationStatus.REJECTED
        invitation.responded_at = datetime.now(timezone.utc)

        self.invitation_repo.save_all()

        return invitation


    def cancel_invitation(self, invitation_id: int, user_id: int):
        invitation = self.invitation_repo.get_by_id(invitation_id)

        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")

        if invitation.status in (InvitationStatus.ACCEPTED, InvitationStatus.REJECTED, InvitationStatus.CANCELLED):
            if invitation.from_user_id != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")

            invitation.status = InvitationStatus.ARCHIVED
            if invitation.responded_at is None:
                invitation.responded_at = datetime.now(timezone.utc)
            self.invitation_repo.save_all()

            return invitation

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail="Only pending invitation can be cancelled, and accepted/rejected/cancelled invitations can be archived by sender",
            )

        if invitation.type == InvitationType.CONTACT:
            if invitation.from_user_id != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")
        else:
            if invitation.from_user_id != user_id:
                member = self.group_service.get_member(invitation.group_id, user_id)
                if member.role != GroupMemberRole.ADMIN:
                    raise HTTPException(status_code=403, detail="Not authorized")

        invitation.status = InvitationStatus.CANCELLED
        invitation.responded_at = datetime.now(timezone.utc)

        self.invitation_repo.save_all()

        return invitation
        

    def accept_contact(self, invitation: Invitation):
        if self.contact_service.exists_between(invitation.from_user_id, invitation.to_user_id):
            raise HTTPException(status_code=400, detail="Contact already exist")   
        
        try:
            self.contact_service.create_contact_pair(invitation.from_user_id, invitation.to_user_id)
            invitation.status = InvitationStatus.ACCEPTED
            invitation.responded_at = datetime.now(timezone.utc)

            self._close_pending_contact_invitations_between(
                invitation.from_user_id,
                invitation.to_user_id,
                exclude_invitation_id=invitation.id,
            )

            self.invitation_repo.save_all()
        except Exception as e:
            self.invitation_repo.db.rollback()
            raise e


    def accept_group(self, invitation: Invitation):
        if self.group_service.group_repo.get_membership(invitation.group_id, invitation.to_user_id) is not None:
            raise HTTPException(status_code=400, detail="User already in group")
        
        try:
            self.group_service.group_repo.add_member(invitation.group_id, invitation.to_user_id)
            invitation.status = InvitationStatus.ACCEPTED
            invitation.responded_at = datetime.now(timezone.utc)

            self.create_missing_contacts_for_group(invitation.group_id, invitation.to_user_id)

            self.invitation_repo.save_all()
        except Exception as e:
            self.invitation_repo.db.rollback()
            raise e


    def create_missing_contacts_for_group(self, group_id: int, new_user_id: int):
        members = self.group_service.group_repo.get_all_members(group_id)

        for member in members:
            other_user_id = member.user_id

            if other_user_id == new_user_id:
                continue

            if not self.contact_service.exists_between(new_user_id, other_user_id):
                self.contact_service.create_contact_pair(new_user_id, other_user_id)
                self._close_pending_contact_invitations_between(new_user_id, other_user_id)


    def _close_pending_contact_invitations_between(
        self,
        user1_id: int,
        user2_id: int,
        exclude_invitation_id: int | None = None,
    ):
        pending_invitations = self.invitation_repo.get_pending_contact_invitations_between(user1_id, user2_id)

        for pending_invitation in pending_invitations:
            if exclude_invitation_id is not None and pending_invitation.id == exclude_invitation_id:
                continue

            pending_invitation.status = InvitationStatus.CANCELLED
            pending_invitation.responded_at = datetime.now(timezone.utc)