from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from app.repositories import InvitationRepository, ContactRepository
from .notification_service import NotificationService
from .user_service import UserService
from app.models import Invitation, Notification
from app.enums import InvitationType, InvitationStatus, NotificationType
from app.schemas import ContactInvitationCreate
import logging

logger = logging.getLogger(__name__)


class InvitationService:
    def __init__(self, db: Session):
        self.invitation_repo = InvitationRepository(db)
        self.contact_repo = ContactRepository(db)
        self.notification_serivce = NotificationService(db)
        self.user_service = UserService(db)

    
    def send_invitation_to_contacts(self, invitation_in: ContactInvitationCreate, from_user_id: int) -> Invitation:
        to_user = self.user_service.get_user(invitation_in.to_user_id)

        if from_user_id == to_user.id:
            raise HTTPException(status_code=400, detail="Cannot invite yourself")
        
        if self.contact_repo.exists_between(from_user_id, to_user.id):
            raise HTTPException(status_code=400, detail="Contact already exist")
        
        try:
            invitation = self.invitation_repo.get_contact_invitation_between(from_user_id, to_user.id)

            if invitation:
                if invitation.status == InvitationStatus.PENDING:
                    raise HTTPException(status_code=400, detail="Invitation already pending")
                elif invitation.status == InvitationStatus.ACCEPTED:
                    raise HTTPException(status_code=400, detail="Invitation already accepted")
                
                invitation.status = InvitationStatus.PENDING
                invitation.responded_at = None
                invitation.created_at = datetime.now(datetime.timezone.utc)
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
        

    def send_invitation_to_group(self) -> Invitation:
        pass