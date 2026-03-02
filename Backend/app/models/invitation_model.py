from sqlalchemy import Column, Integer, Enum, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums import InvitationStatus, InvitationType


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)

    type = Column(Enum(InvitationType, name="invitation_type"), nullable=False, default=InvitationType.CONTACT)
    status = Column(Enum(InvitationStatus, name="invitation_status"), nullable=False, default=InvitationStatus.PENDING)

    from_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
    group = relationship("Group")


    __table_args__ = (
        UniqueConstraint(
            "type", "inviter_id", "invitee_id", "group_id",
            name="uq_unique_invitation"
        ),
        CheckConstraint("from_user_id <> to_user_id", name="ck_no_self_invite"),
        CheckConstraint(
            "(type = 'group' AND group_id IS NOT NULL) OR "
            "(type = 'contact' AND group_id IS NULL)",
            name="ck_invitation_type_group_logic"
        )   
    )