from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import Invitation
from app.enums import InvitationType


class InvitationRepository:
    def __init__(self, db: Session):
        self.db = db


    def get_by_unique_key(
        self,
        invitation_type: InvitationType,
        from_user_id: int,
        to_user_id: int,
        group_id: int | None,
    ) -> Invitation | None:
        return (
            self.db.query(Invitation)
            .filter(
                Invitation.type == invitation_type,
                Invitation.from_user_id == from_user_id,
                Invitation.to_user_id == to_user_id,
                Invitation.group_id == group_id,
            )
            .one_or_none()
        )


    def get_contact_invitation_between(
        self,
        user1_id: int,
        user2_id: int,
    ) -> Invitation | None:
        return (
            self.db.query(Invitation)
            .filter(
                Invitation.type == InvitationType.CONTACT,
                or_(
                    and_(
                        Invitation.from_user_id == user1_id,
                        Invitation.to_user_id == user2_id,
                    ),
                    and_(
                        Invitation.from_user_id == user2_id,
                        Invitation.to_user_id == user1_id,
                    ),
                ),
            )
            .one_or_none()
        )


    def create(self, invitation: Invitation):
        self.db.add(invitation)
        self.db.flush()


    def save_all(self):
        self.db.commit()


    def refresh(self, invitation: Invitation):
        self.db.refresh(invitation)