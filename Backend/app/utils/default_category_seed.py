from sqlalchemy.orm import Session
from app.models import Category
from app.enums import DEFAULT_EXPENSE_CATEGORIES


def seed_default_categories(db: Session):
    for default_category in DEFAULT_EXPENSE_CATEGORIES:
        exists = db.query(Category).filter(
            Category.name == default_category.name,
            Category.user_id.is_(None),
            Category.group_id.is_(None)
        ).first()
        if not exists:
            db.add(Category(name=default_category.name, section=default_category.section))
        elif exists.section != default_category.section:
            exists.section = default_category.section
    db.commit()