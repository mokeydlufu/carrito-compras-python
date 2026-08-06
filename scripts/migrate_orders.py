import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import engine, Base, ensure_database_schema

ensure_database_schema(engine=engine, base=Base)
print('schema migration complete')
