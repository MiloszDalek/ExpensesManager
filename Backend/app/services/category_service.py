from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.repositories import CategoryRepository, GroupRepository
from app.models import Category
from app.schemas import CategoryCreate
from app.enums import GroupMemberRole


class CategoryService:
    def __init__(self, db: Session):
        self.category_repo = CategoryRepository(db)
        self.group_repo = GroupRepository(db)
        

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


    def validate_available_for_group_expense(self, category_id: int, group_id: int):
        category = self.get_by_id(category_id)
        
        if category.user_id is not None:
            raise HTTPException(status_code=400, detail="Not a group category")
        if category.group_id not in (group_id, None):
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

        try:
            category = Category(
                name=category_in.name,
                user_id=user_id,
                group_id=None
            )
            category = self.category_repo.create(category)
            self.category_repo.save_all()

            return category
        
        except Exception:
            self.category_repo.db.rollback()
            raise
    

    def delete_personal_category(self, category_id: int, user_id: int):
        category = self.get_by_id(category_id)
        
        if category.group_id is not None or category.user_id is None:
            raise HTTPException(status_code=400, detail="Not a personal category")
        
        if category.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if self.category_repo.has_expenses(category_id):
            raise HTTPException(status_code=400, detail="Cannot delete category assigned to expenses")
        
        try:
            self.category_repo.delete(category)
            self.category_repo.save_all()

        except Exception:
            self.category_repo.db.rollback()


    def create_group_category(self, category_in: CategoryCreate, group_id: int, user_id: int) -> Category:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        membership = self.group_repo.get_membership(group_id, user_id)
        if not membership:
            raise HTTPException(status_code=403, detail="Not authorized not a group member")
        if membership.role != GroupMemberRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized admin role required")

        category = Category(
            name=category_in.name.strip().lower(),
            group_id=group_id,
            user_id=None
        )

        try:
            category = self.category_repo.create(category)
            self.category_repo.save_all()

            return category
        
        except IntegrityError:
            self.category_repo.db.rollback()
            raise HTTPException(status_code=400, detail="Category already exists")
        

    def get_group_categories(self, group_id: int, user_id: int) -> list[Category]:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        membership = self.group_repo.get_membership(group_id, user_id)
        if not membership:
            raise HTTPException(status_code=403, detail="Not authorized")

        return self.category_repo.get_all_by_group_id(group_id)
    

    def get_default_and_group_categories(self, group_id: int, user_id: int) -> list[Category]:
        group = self.group_repo.get_by_id(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        membership = self.group_repo.get_membership(group_id, user_id)
        if not membership:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return self.category_repo.get_all_default_and_by_group_id(group_id)
    

    def delete_group_category(self, category_id: int, user_id: int):
        category = self.get_by_id(category_id)

        if category.group_id is None or category.user_id is not None:
            raise HTTPException(status_code=400, detail="Not a group category")

        membership = self.group_repo.get_membership(category.group_id, user_id)
        
        if not membership:
            raise HTTPException(status_code=403, detail="Not authorized not a group member")
        if membership.role != GroupMemberRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized admin role required")

        try:
            self.category_repo.delete(category)
            self.category_repo.save_all()

        except Exception:
            self.category_repo.db.rollback()
            raise