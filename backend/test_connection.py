import sys
import importlib

# Remove all app modules from cache
modules_to_remove = [m for m in sys.modules if m.startswith('app')]
for m in modules_to_remove:
    del sys.modules[m]

print(f"Removed {len(modules_to_remove)} cached modules")

# Now import fresh
from dotenv import load_dotenv
import os

# Force reload
load_dotenv(override=True)

from app.config import Config
print(f"DATABASE_URL: {Config.DATABASE_URL}")
print(f"DATABASE_URL length: {len(Config.DATABASE_URL)}")

# Try to connect
from app.database.connection import engine
try:
    with engine.connect() as conn:
        print("✅ Connection successful!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
