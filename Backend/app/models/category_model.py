from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index, CheckConstraint, Enum as SAEnum
from sqlalchemy.sql import func, expression
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums import CategorySection


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    section = Column(SAEnum(CategorySection, name="category_section"), nullable=False, default=CategorySection.OTHER)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    expenses = relationship("Expense", back_populates="category")
    recurring_expenses = relationship("RecurringExpense", back_populates="category")

    user = relationship("User", back_populates="personal_categories")
    group = relationship("Group", back_populates="group_categories")

    __table_args__ = (
        Index(
            "uq_global_category",
            "name",
            unique=True,
            postgresql_where=expression.and_(
                user_id.is_(None),
                group_id.is_(None)
            )
        ),
        Index(
            "uq_user_category",
            "user_id",
            "name",
            unique=True,
            postgresql_where=user_id.isnot(None)
        ),
        Index(
            "uq_group_category",
            "group_id",
            "name",
            unique=True,
            postgresql_where=group_id.isnot(None)
        ),
    )

    CheckConstraint(
        """
        (user_id IS NOT NULL AND group_id IS NULL)
        OR
        (user_id IS NULL AND group_id IS NOT NULL)
        OR
        (user_id IS NULL AND group_id IS NULL)
        """,
        name="ck_category_context"
    )