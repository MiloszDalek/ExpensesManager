from sqlalchemy import Column, Enum as SAEnum, Integer, String, ForeignKey, DateTime, Text, Index, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.enums import GroupStatus, CurrencyEnum


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    status = Column(SAEnum(GroupStatus, name="group_status"), default=GroupStatus.ACTIVE, nullable=False)
    currency = Column(SAEnum(CurrencyEnum, name="currency_enum"), default=CurrencyEnum.PLN, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_by_user = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan", passive_deletes=True)
    expenses = relationship("Expense", back_populates="group")

    group_categories = relationship("Category", back_populates="group")

    settlements = relationship("Settlement", back_populates="group", cascade="all, delete-orphan")

    __table_args__ = (
        Index(
            "uq_user_group_active_name",
            "created_by",
            "name",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
        ),
    )