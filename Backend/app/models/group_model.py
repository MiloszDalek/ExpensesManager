from sqlalchemy import Column, Enum, Integer, String, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import GroupStatus


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    status = Column(Enum(GroupStatus, name="group_status"), default=GroupStatus.ACTIVE, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_by_user = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan", passive_deletes=True)
    expenses = relationship("Expense", back_populates="group")

    group_categories = relationship("Category", back_populates="group")

    settlements = relationship("Settlement", back_populates="group", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("created_by", "name", name="uq_user_group_name"),
    )