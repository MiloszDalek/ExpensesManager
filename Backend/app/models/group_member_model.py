from sqlalchemy import Column, Index, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        Index("uq_group_member", "user_id", "group_id", unique=True),
    )
