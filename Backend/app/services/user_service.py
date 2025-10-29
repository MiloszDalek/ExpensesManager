from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas import UserCreate
from app.utils.auth_utils import get_password_hash


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

    
def create_user(db: Session, user_data: UserCreate):
    db_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        username=user_data.username,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_all_users(db: Session):
    return db.query(User).all()


def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False


def update_user(db: Session, user_id: int, new_data: dict):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    for key, value in new_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user