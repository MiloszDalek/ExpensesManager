start powershell -Command "cd Backend; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

start powershell -Command "cd Frontend; npm run dev" 