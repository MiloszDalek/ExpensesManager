from app.database import engine, Base
from sqlalchemy import text


def reset_database():
    with engine.begin() as conn:
        Base.metadata.drop_all(bind=engine)

        conn.execute(text("DROP TYPE IF EXISTS invitation_type CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS invitation_status CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS system_user_roles CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS currency_enum CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS group_member_role CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS group_member_status CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS group_status CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS notification_type CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS notification_severity CASCADE"))
        conn.execute(text("DROP TYPE IF EXISTS split_type CASCADE")) 

        Base.metadata.create_all(bind=engine)