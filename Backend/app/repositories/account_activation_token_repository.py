from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import AccountActivationToken


class AccountActivationTokenRepository:
    def __init__(self, db: Session):
        self.db = db


    def create(self, user_id: int, token_hash: str, expires_at: datetime) -> AccountActivationToken:
        record = AccountActivationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record


    def get_active_by_hash(self, token_hash: str) -> AccountActivationToken | None:
        now = datetime.now(timezone.utc)
        return (
            self.db.query(AccountActivationToken)
            .filter(
                AccountActivationToken.token_hash == token_hash,
                AccountActivationToken.used_at.is_(None),
                AccountActivationToken.expires_at > now,
            )
            .first()
        )


    def mark_used(self, record: AccountActivationToken) -> None:
        record.used_at = datetime.now(timezone.utc)
        self.db.add(record)
        self.db.commit()


    def invalidate_active_for_user(self, user_id: int) -> None:
        now = datetime.now(timezone.utc)
        (
            self.db.query(AccountActivationToken)
            .filter(
                AccountActivationToken.user_id == user_id,
                AccountActivationToken.used_at.is_(None),
            )
            .update({AccountActivationToken.used_at: now}, synchronize_session=False)
        )
        self.db.commit()
