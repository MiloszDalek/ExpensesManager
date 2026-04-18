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


**command for counting lines of code**
```
cloc . --vcs=git --not-match-f='(components.json|eslint.config.js|package-lock.json|package.json|tsconfig.app.json|tsconfig.json|tsconfig.node.json|vite.config.ts|_metadata.json)'
```