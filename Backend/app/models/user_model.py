from sqlalchemy import Column, DateTime, Enum, Integer, String, Boolean, func
from app.database import Base
from sqlalchemy.orm import relationship
from app.enums import SystemUserRole


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(SystemUserRole, name="system_user_roles"), default=SystemUserRole.USER, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    groups_created = relationship("Group", back_populates="created_by_user", passive_deletes=True)
    memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    expenses = relationship("Expense", back_populates="user")
    recurring_expenses = relationship("RecurringExpense", back_populates="user")
    expense_shares = relationship("ExpenseShare", back_populates="user")

    sent_settlements = relationship("Settlement", foreign_keys="Settlement.from_user_id", back_populates="from_user")
    received_settlements = relationship("Settlement", foreign_keys="Settlement.to_user_id", back_populates="to_user")

    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user")
    contact_of = relationship("Contact", foreign_keys="Contact.contact_id", back_populates="contact")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    personal_categories = relationship("Category", back_populates="user")
    income_entries = relationship("IncomeEntry", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    budget_plans = relationship("BudgetPlan", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    savings_goals = relationship("SavingsGoal", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)