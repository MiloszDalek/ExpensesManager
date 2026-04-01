from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import InvitationService
from app.models import User
from app.schemas import ContactInvitationCreate, GroupInvitationCreate, InvitationResponse
from app.enums import InvitationType, InvitationStatus
from app.utils.auth_dependencies import get_current_active_user
import logging

logger = logging.getLogger(__name__)


invitation_router = APIRouter(
    prefix="/invitations",
    tags=["Invitations"]
)


def get_invitation_service(db: Session = Depends(get_db)):
    return InvitationService(db)


@invitation_router.post("/send/contacts", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def send_contact_invitation(
    invitation_in: ContactInvitationCreate,
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.send_invitation_to_contacts(invitation_in, current_user.id)


@invitation_router.post("/send/groups", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def send_group_invitation(
    invitation_in: GroupInvitationCreate,
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.send_invitation_to_group(invitation_in, current_user.id)


@invitation_router.get("/pending", response_model=list[InvitationResponse])
def get_pending_invitations(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_pending_invitations_for_user(current_user.id, limit, offset)


@invitation_router.get("/sent", response_model=list[InvitationResponse])
def get_sent_invitations(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    invitation_type: InvitationType | None = Query(None, alias="type"),
    invitation_status: InvitationStatus | None = Query(None, alias="status"),
    include_archived: bool = Query(False),
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_sent_invitations_for_user(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        invitation_type=invitation_type,
        invitation_status=invitation_status,
        include_archived=include_archived,
    )


@invitation_router.get("/groups/{group_id}/pending", response_model=list[InvitationResponse])
def get_group_pending_invitations(
    group_id: int,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user),
):
    return service.get_group_pending_invitations(group_id, current_user.id, limit, offset)


@invitation_router.patch("/{invitation_id}/accept", response_model=InvitationResponse)
def accept_invitation(
    invitation_id: int,
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.accept_invitation(invitation_id, current_user.id)


@invitation_router.patch("/{invitation_id}/decline", response_model=InvitationResponse)
def decline_invitation(
    invitation_id: int,
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.decline_invitation(invitation_id, current_user.id)


@invitation_router.delete("/{invitation_id}", response_model=InvitationResponse)
def cancel_invitation(
    invitation_id: int,
    service: InvitationService = Depends(get_invitation_service),
    current_user: User = Depends(get_current_active_user)
):
    return service.cancel_invitation(invitation_id, current_user.id)