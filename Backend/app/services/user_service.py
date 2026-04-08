from sqlalchemy.orm import Session
from app.models.user_model import User
from fastapi import HTTPException
from app.schemas import UserCreate, UserUpdate
from app.utils.auth_utils import get_password_hash
from app.repositories.user_repository import UserRepository
from app.enums import SystemUserRole


class UserService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)


    def create_user(self, user_data: UserCreate) -> User:
        if self.user_repo.get_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Email already in use")

        user = User(
            username=user_data.username,            
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
        )
        return self.user_repo.create(user)        


    def get_user(self, user_id: int) -> User:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user        


    def get_user_by_email(self, email: str) -> User:
        user = self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User with this email does not exist")
        return user


    def get_all_users(self) -> list[User]:
        return self.user_repo.get_all()


    def get_all_users_with_activity(
        self,
        search: str | None = None,
        role: SystemUserRole | None = None,
        is_active: bool | None = None,
    ):
        rows = self.user_repo.get_all_with_activity(
            search=search,
            role=role,
            is_active=is_active,
        )

        response = []
        for row in rows:
            user = row[0]
            groups_count = int(row.groups_count or 0)
            expenses_count = int(row.expenses_count or 0)
            sent_invitations_count = int(row.sent_invitations_count or 0)
            settlements_count = int(row.settlements_count or 0)

            timestamps = [
                user.created_at,
                row.last_expense_at,
                row.last_invitation_at,
                row.last_settlement_at,
            ]
            non_null_timestamps = [value for value in timestamps if value is not None]
            last_activity_at = max(non_null_timestamps) if non_null_timestamps else None

            response.append(
                {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "role": user.role,
                    "is_active": user.is_active,
                    "created_at": user.created_at,
                    "groups_count": groups_count,
                    "expenses_count": expenses_count,
                    "sent_invitations_count": sent_invitations_count,
                    "settlements_count": settlements_count,
                    "last_activity_at": last_activity_at,
                }
            )

        return response


    def get_users_activity_stats(
        self,
        search: str | None = None,
        role: SystemUserRole | None = None,
        is_active: bool | None = None,
    ):
        row = self.user_repo.get_activity_stats(
            search=search,
            role=role,
            is_active=is_active,
        )

        return {
            "total_users": int(row.total_users or 0),
            "active_users": int(row.active_users or 0),
            "inactive_users": int(row.inactive_users or 0),
        }


    def delete_user(self, user_id: int, current_admin_id: int | None = None) -> User:
        raise HTTPException(status_code=400, detail="User deletion is disabled by system policy")


    def update_user(self, user_id: int, new_data: UserUpdate, current_admin_id: int | None = None):
        user = self.get_user(user_id)
        update_data = new_data.model_dump(exclude_unset=True)

        if "email" in update_data:
            existing_user = self.user_repo.get_by_email(update_data["email"])
            if existing_user and existing_user.id != user_id:
                raise HTTPException(status_code=400, detail="Email already in use")

        if "role" in update_data and update_data["role"] != user.role:
            raise HTTPException(
                status_code=400,
                detail="System admin role changes are disabled",
            )

        if "is_active" in update_data and update_data["is_active"] is False and user.role == SystemUserRole.ADMIN:
            raise HTTPException(status_code=400, detail="System admin account cannot be deactivated")

        if current_admin_id is not None and user.id == current_admin_id:
            if "is_active" in update_data and update_data["is_active"] is False and user.is_active:
                raise HTTPException(status_code=400, detail="Admin cannot deactivate own account")

        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

        for key, value in update_data.items():
            setattr(user, key, value)

        return self.user_repo.create(user)
