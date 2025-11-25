from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_by_user = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group")
    expenses = relationship("Expense", back_populates="group")