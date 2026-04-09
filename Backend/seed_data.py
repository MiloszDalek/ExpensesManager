from pathlib import Path
import os
import sys


BASE_DIR = Path(__file__).resolve().parent
os.chdir(BASE_DIR)

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.seeders.cli import main


if __name__ == "__main__":
    raise SystemExit(main())
