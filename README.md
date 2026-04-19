# Expenses Manager
Expenses Manager is a web application designed to help users manage shared expenses within groups or keep track of their personal spending.

## Test data seeding

Backend includes a synthetic data seeder for high-volume UI and business-logic testing.

Run from `Backend` directory:

```powershell
python seed_data.py
```

Useful options:

```powershell
python seed_data.py --profile medium
python seed_data.py --users 120 --groups 90 --personal-expenses 18000 --group-expenses 12000
python seed_data.py --personal-recurring-expenses 1200 --group-recurring-expenses 700
python seed_data.py --max-personal-recurring-per-user 3 --max-group-recurring-per-group 3
python seed_data.py --seed 42
python seed_data.py --max-days-back 1095 --edge-case-ratio 0.15
```

Defaults:
- append-only mode (adds new data on each run),
- random distribution every run (unless `--seed` is provided),
- generated users share password: `password`.

Example full run with recurring data:

```powershell
python seed_data.py --users 120 --groups 90 --personal-expenses 18000 --group-expenses 12000 --personal-recurring-expenses 200 --group-recurring-expenses 220 --max-personal-recurring-per-user 3 --max-group-recurring-per-group 3 --seed 42
```

## PayPal modes

PayPal behavior is controlled with `.env` flags in backend and frontend.

Backend (`Backend/.env`):
- `PAYPAL_ENABLED=true|false`
- `PAYPAL_MODE=disabled|sandbox|live|mock`

Frontend (`Frontend/.env`):
- `VITE_PAYPAL_ENABLED=true|false`
- `VITE_PAYPAL_MODE=disabled|sandbox|live|mock`
- `VITE_PAYPAL_CLIENT_ID=...` (required for `sandbox` and `live`)

Mode behavior:
- `disabled`: PayPal button is hidden in UI and backend rejects PayPal settlement flow.
- `sandbox`: regular PayPal Sandbox API flow.
- `live`: regular PayPal Live API flow.
- `mock`: debug mode without real PayPal API calls, but with full settlement flow in app.

`*_ENABLED=false` has priority and behaves like `disabled`.

## Backend deployment on Railway with Tesseract OCR

For production OCR with `pytesseract`, the app needs system-level `tesseract` binaries.
Use Docker deployment for backend so Railway builds a container with required OS packages.

1. In Railway create/open backend service.
2. Set service Root Directory to `Backend`.
3. Ensure service uses Dockerfile build (Railway auto-detects `Backend/Dockerfile`).
4. Add all required backend environment variables in Railway (the same values you normally keep in backend `.env`).
5. Deploy.

Docker image in `Backend/Dockerfile` installs:
- `tesseract-ocr`
- `tesseract-ocr-eng`
- `tesseract-ocr-pol`

Startup command inside container is handled by `Backend/start_server.py`.
The script reads `PORT` from environment and converts it to integer before launching Uvicorn.

Important for Railway:
- for Docker deployment, leave Railway Start Command empty
- alternatively set Start Command to `python start_server.py`
- do not use `--port $PORT` directly in Railway Start Command (it may be passed as literal string)

Quick post-deploy check:
- open backend logs and verify no `TesseractNotFoundError`
- call OCR endpoint and confirm response uses OCR status `done` (for readable receipt image)


**command for counting lines of code**
```
cloc . --vcs=git --not-match-f='(components.json|eslint.config.js|package-lock.json|package.json|tsconfig.app.json|tsconfig.json|tsconfig.node.json|vite.config.ts|_metadata.json)'
```