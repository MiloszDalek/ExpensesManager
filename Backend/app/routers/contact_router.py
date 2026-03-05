from fastapi import APIRouter, Depends, Query
from app.services import ContactService
from app.models import User
from app.schemas import ContactResponse
from app.database import get_db
from app.utils.auth_dependencies import get_current_active_user


contact_router = APIRouter(
    prefix="/contacts",
    tags=["Contacts"]
)

def get_contact_service(db = Depends(get_db)):
    return ContactService(db)


@contact_router.get("", response_model=list[ContactResponse])
def get_contacts(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: ContactService = Depends(get_contact_service),    
    current_user: User = Depends(get_current_active_user),
):
    return service.get_user_contacts(current_user.id, limit, offset)