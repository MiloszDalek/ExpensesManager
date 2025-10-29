from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.database import Base, engine
from app.routers import auth_router, user_router
from app.services.auth_service import create_admin
from app import models

settings = get_settings()

app = FastAPI(title="Expenses Manager API")

# Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix='/api')
app.include_router(user_router, prefix='/api', tags=['Users'])

create_admin()

@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API is running!"}