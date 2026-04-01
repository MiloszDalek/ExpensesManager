from sqlalchemy.orm import Session, selectinload
from app.models import Contact


class ContactRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, contact: Contact):
        self.db.add(contact)

    
    def get_by_id_pair(self, user1_id: int, user2_id: int) -> Contact:
        return (
            self.db.query(Contact)
            .filter(
                Contact.user_id == user1_id,
                Contact.contact_id == user2_id
            )
            .first()
        )
    
    def get_all_by_user_id(self, user_id: int, limit: int, offset: int):
        return (
            self.db.query(Contact)
            .filter(Contact.user_id == user_id)
            .options(selectinload(Contact.contact))
            .order_by(Contact.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
    