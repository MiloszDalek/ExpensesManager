from sqlalchemy import Column, Index, Integer, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    contact_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    status = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact = relationship("User", foreign_keys=[contact_id], back_populates="contact_of")

    __table_args__ = (
        Index("uq_contacts", "user_id", "contact_id", unique=True),
    )
