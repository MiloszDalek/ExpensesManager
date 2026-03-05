from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Contact


class ContactRepository:
    def __init__(self, db: Session):
        self.db = db

    
    def exists_between(self, user1_id: int, user2_id: int) -> bool:
        u1 = min(user1_id, user2_id)
        u2 = max(user1_id, user2_id)

        stmt = (
            select(Contact.id)
            .where(
                Contact.user_id == u1,
                Contact.contact_id == u2
            )
            .limit(1)
        )

        return self.db.execute(stmt).scalar() is not None