from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import InvitationService
from app.models import User
from app.schemas import ContactInvitationResponse, ContactInvitationCreate
from app.utils.auth_dependencies import get_current_active_user
import logging

logger = logging.getLogger(__name__)


invitation_router = APIRouter(
    prefix="/invitations",
    tags=["Invitations"]
)


def get_invitation_service(db: Session = Depends(get_db)):
    return InvitationService(db)


@invitation_router.post("/send/contacts", response_model=ContactInvitationResponse, status_code=status.HTTP_201_CREATED)
def send_invitation(
    invitation_in: ContactInvitationCreate,
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.send_invitation_to_contacts(invitation_in, current_user.id)


# @invitation_router.post("/send/groups", response_model=ContactInvitationResponse, status_code=status.HTTP_201_CREATED)
# def send_invitation(
#     invitation_in,
#     service: InvitationService = Depends(get_invitation_service),
#     current_user: User = Depends(get_current_active_user)
# ):
#     return service.send_invitation_to_group(invitation_in, current_user.id)