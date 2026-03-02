from sqlalchemy import Column, Enum, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import GroupMemberStatus, GroupMemberRole


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    role = Column(Enum(GroupMemberRole, name="group_member_role"), default=GroupMemberRole.MEMBER, nullable=False)
    status = Column(Enum(GroupMemberStatus, name="group_member_status"), default=GroupMemberStatus.ACTIVE, nullable=False)

    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("user_id", "group_id", name="uq_group_member")
    )
