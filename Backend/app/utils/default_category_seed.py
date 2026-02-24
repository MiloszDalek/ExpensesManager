from sqlalchemy.orm import Session
from app.models import Category
from app.enums import DefaultExpenseCategory


def seed_default_categories(db: Session):
    for category_enum in DefaultExpenseCategory:
        exists = db.query(Category).filter(
            Category.name == category_enum.value,
            Category.user_id.is_(None),
            Category.group_id.is_(None)
        ).first()
        if not exists:
            db.add(Category(name=category_enum.value))
    db.commit()