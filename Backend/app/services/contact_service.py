from sqlalchemy.orm import Session
from app.models import Contact
from app.repositories import ContactRepository


class ContactService:
    def __init__(self, db: Session):
        self.contact_repo = ContactRepository(db)


    def create_contact_pair(self, user1_id: int, user2_id: int):
        contact1 = Contact(
            user_id=user1_id,
            contact_id=user2_id
        )

        contact2 = Contact(
            user_id=user2_id,
            contact_id=user1_id
        )

        self.contact_repo.create(contact1)
        self.contact_repo.create(contact2)

    
    def exists_between(self, user1_id: int, user2_id: int) -> bool:
        return self.contact_repo.get_by_id_pair(user1_id, user2_id) is not None
    

    def get_user_contacts(self, user_id: int, limit: int, offset: int) -> list[Contact]:
        return self.contact_repo.get_all_by_user_id(user_id, limit, offset)