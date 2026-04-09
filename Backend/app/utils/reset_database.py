from app.database import engine, Base
from sqlalchemy import inspect, text


def reset_database():
    with engine.begin() as conn:
        inspector = inspect(conn)
        schema_name = inspector.default_schema_name or "public"
        quote = conn.dialect.identifier_preparer.quote

        # Drop every table in the target schema, including stale tables that are no longer in ORM metadata.
        for table_name in inspector.get_table_names(schema=schema_name):
            conn.execute(
                text(
                    f"DROP TABLE IF EXISTS {quote(schema_name)}.{quote(table_name)} CASCADE"
                )
            )

        enum_rows = conn.execute(
            text(
                """
                SELECT t.typname
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typtype = 'e' AND n.nspname = :schema_name
                """
            ),
            {"schema_name": schema_name},
        ).all()

        for enum_row in enum_rows:
            conn.execute(
                text(
                    f"DROP TYPE IF EXISTS {quote(schema_name)}.{quote(enum_row.typname)} CASCADE"
                )
            )

        Base.metadata.create_all(bind=conn)