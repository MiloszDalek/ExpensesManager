from sqlalchemy import Column, DateTime, Enum, Integer, String, Boolean, func
from app.database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(Enum("user", "admin", name="user_roles"), default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    groups_created = relationship("Group", back_populates="created_by_user")
    memberships = relationship("GroupMember", back_populates="user")
    expenses = relationship("Expense", back_populates="payer")
    expense_shares = relationship("ExpenseShare", back_populates="user")

    sent_settlements = relationship("Settlement", foreign_keys="Settlement.from_user_id", back_populates="from_user")
    received_settlements = relationship("Settlement", foreign_keys="Settlement.to_user_id", back_populates="to_user")

    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user")
    contact_of = relationship("Contact", foreign_keys="Contact.contact_id", back_populates="contact")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    bank_tokens = relationship("BankToken", back_populates="user")