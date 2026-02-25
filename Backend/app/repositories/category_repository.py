from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
from app.models import Category


class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db


    def get_by_id(self, category_id: int) -> Category | None:
        return self.db.query(Category).filter(Category.id == category_id).first()
    

    def get_by_name_and_user(self, name: str, user_id: int, group_id: Optional[int] = None) -> Optional[Category]:
        return (
            self.db.query(Category)
            .filter(
                Category.name == name,
                Category.user_id == user_id,
                Category.group_id == group_id
            )
            .first()
        )


    def get_all_default(self) -> list[Category]:
        return self.db.query(Category).filter(
                Category.user_id.is_(None), 
                Category.group_id.is_(None)
            ).all()


    def get_all_personal(self, user_id: int) -> list[Category]:
        return self.db.query(Category).filter(
                Category.user_id == user_id,
                Category.group_id.is_(None)
            ).all()


    def get_all_default_and_personal(self, user_id: int) -> list[Category]:
        return self.db.query(Category).filter(
                Category.group_id.is_(None),
                or_(
                    Category.user_id.is_(None),
                    Category.user_id == user_id
                )
            ).all()
    

    def create(self, category: Category) -> Category:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category
    

    def delete(self, category: Category):
        self.db.delete(category)
        self.db.commit()