import os
import tempfile
import unittest

from sqlalchemy import Column, Float, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import declarative_base

from database import ensure_database_schema


class TestSchemaMigration(unittest.TestCase):
    def test_ensure_database_schema_adds_missing_order_columns(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            db_path = os.path.join(tmp_dir, "test.db")
            engine = create_engine(f"sqlite:///{db_path}")
            Base = declarative_base()

            class Order(Base):
                __tablename__ = "orders"
                id = Column(Integer, primary_key=True)
                total = Column(Float)
                estado = Column(String, default="PENDIENTE")

            Base.metadata.create_all(bind=engine)
            with engine.begin() as conn:
                conn.execute(text("DROP TABLE orders"))
                conn.execute(text("CREATE TABLE orders (id INTEGER PRIMARY KEY, total FLOAT, estado VARCHAR)"))

            ensure_database_schema(engine=engine, base=Base)

            inspector = inspect(engine)
            columns = {column["name"] for column in inspector.get_columns("orders")}

            self.assertIn("shipping_name", columns)
            self.assertIn("shipping_email", columns)
            self.assertIn("shipping_address", columns)
            self.assertIn("shipping_city", columns)
            self.assertIn("shipping_postal", columns)

            engine.dispose()


if __name__ == "__main__":
    unittest.main()
