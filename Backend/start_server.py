import os

import uvicorn

print(">>> START_SERVER.PY IS RUNNING")
print("PORT ENV:", os.getenv("PORT"))


def _read_port() -> int:
    raw_value = os.getenv("PORT", "8000").strip()
    try:
        return int(raw_value)
    except ValueError:
        return 8000


if __name__ == "__main__":
    print("Main running")
    uvicorn.run("app.main:app", host="0.0.0.0", port=_read_port())
