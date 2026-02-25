from sqlalchemy.orm import Session
from app.repositories import CategoryRepository
from app.models import Category
from app.schemas import CategoryCreate
from fastapi import HTTPException


class CategoryService:
    def __init__(self, db: Session):
        self.category_repo = CategoryRepository(db)
        

    def get_by_id(self, category_id: int) -> Category:
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category


    def validate_available_for_personal_expense(self, category_id: int, user_id: int):
        category = self.get_by_id(category_id)
        
        if category.group_id is not None:
            raise HTTPException(status_code=400, detail="Not a personal category")
        if category.user_id not in (user_id, None):
            raise HTTPException(status_code=403, detail="Not authorized")
        return category


    def get_default_categories(self) -> list[Category]:
        return self.category_repo.get_all_default()


    def get_personal_categories(self, user_id: int) -> list[Category]:
        return self.category_repo.get_all_personal(user_id)


    def get_default_and_personal_categories(self, user_id: int) -> list[Category]:
        return self.category_repo.get_all_default_and_personal(user_id)


    def create_personal_category(self, category_in: CategoryCreate, user_id: int) -> Category:
        existing = self.category_repo.get_by_name_and_user(
            name=category_in.name,
            user_id=user_id,
            group_id=None
        )
        if existing:
            raise HTTPException(status_code=400, detail=f"Category '{category_in.name}' already exists")    

        category = Category(
            name=category_in.name,
            user_id=user_id,
            group_id=None
        )
        return self.category_repo.create(category)
    

    def delete_personal_category(self, category_id: int, user_id: int):
        category = self.get_by_id(category_id)
        
        if category.group_id is not None or category.user_id is None:
            raise HTTPException(status_code=400, detail="Not a personal category")
        
        if category.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        self.category_repo.delete(category)