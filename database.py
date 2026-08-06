# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, inspect, text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./tienda2.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_database_schema(engine=None, base=None):
    engine = engine or globals()["engine"]
    base = base or globals()["Base"]
    base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "orders" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("orders")}
    missing_columns = {
        "shipping_name": "VARCHAR",
        "shipping_email": "VARCHAR",
        "shipping_address": "VARCHAR",
        "shipping_city": "VARCHAR",
        "shipping_postal": "VARCHAR",
    }

    with engine.begin() as conn:
        for column_name, column_type in missing_columns.items():
            if column_name not in columns:
                conn.execute(text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}"))


ensure_database_schema()


# Dependency para obtener sesión DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
