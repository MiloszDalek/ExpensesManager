from sqlalchemy.orm import Session
from app.models.user_model import User
from fastapi import HTTPException
from app.schemas import UserCreate, UserUpdate
from app.utils.auth_utils import get_password_hash
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)


    def create_user(self, user_data: UserCreate) -> User:
        if self.user_repo.get_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Email already in use")

        user = User(
            username=user_data.username,            
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
        )
        return self.user_repo.create(user)        


    def get_user(self, user_id: int) -> User:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user        


    def get_all_users(self) -> list[User]:
        return self.user_repo.get_all()


    def delete_user(self, user_id: int) -> User:
        user = self.get_user(user_id)
        self.user_repo.delete(user)
        return user


    def update_user(self, user_id: int, new_data: UserUpdate):
        user = self.get_user(user_id)
        update_data = new_data.model_dump(exclude_unset=True)

        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

        for key, value in update_data.items():
            setattr(user, key, value)

        return self.user_repo.create(user)