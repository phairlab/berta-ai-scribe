# initialize_aurora_db.py
from app.config.db import Base, engine

if __name__ == "__main__":
    print("Creating all tables in Aurora/Postgres...")
    Base.metadata.create_all(engine)
    print("Done! All tables created.")
