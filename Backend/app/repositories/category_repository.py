from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models import Category


class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db


    def get_by_id(self, category_id: int) -> Category | None:
        return self.db.query(Category).filter(Category.id == category_id).first()


    def get_available_for_personal_expense(self, category_id: int, user_id: int):
        return (
            self.db.query(Category)
            .filter(
                Category.id == category_id,
                Category.group_id.is_(None),
                or_(
                    Category.user_id == user_id,
                    Category.user_id.is_(None)
                )
            )
            .first()
        )