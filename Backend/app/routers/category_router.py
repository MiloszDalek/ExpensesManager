from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.services import CategoryService
from app.database import get_db
from app.models import User
from app.schemas import CategoryCreate, CategoryResponse
from app.utils.auth_dependencies import get_current_active_user

category_router = APIRouter(
    prefix="/category",
    tags=["Categories"],
)


def get_category_service(db: Session = Depends(get_db)):
    return CategoryService(db)


@category_router.get("/default", response_model=list[CategoryResponse])
def get_default_categories(
    service: CategoryService = Depends(get_category_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_default_categories()


@category_router.get("/personal", response_model=list[CategoryResponse])
def get_personal_categories(
    service: CategoryService = Depends(get_category_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_personal_categories(current_user.id)


@category_router.get("/available/personal", response_model=list[CategoryResponse])
def get_default_and_personal_categories(
    service: CategoryService = Depends(get_category_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.get_default_and_personal_categories(current_user.id)


@category_router.post("/personal", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_personal_category(
    category_in: CategoryCreate,
    service: CategoryService = Depends(get_category_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.create_personal_category(category_in, current_user.id)


@category_router.delete("/personal/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personal_category(
    category_id: int,
    service: CategoryService = Depends(get_category_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.delete_personal_category(category_id, current_user.id)