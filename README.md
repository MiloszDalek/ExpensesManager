# Expenses Manager

Expenses Manager is a full-stack web application designed to help users manage personal and shared finances by tracking income and expenses, organizing transactions, and simplifying settlements between users.

The application allows users to manage individual expenses as well as create groups for shared financial activities. Group members can monitor shared expenses, track contributions, and maintain clear settlements between participants.

The project was created to gain practical experience in building a modern web application with a Python-based backend, REST API architecture, database integration, and a TypeScript frontend.

## Features

- User registration and authentication
- Secure access using JWT-based authentication
- Adding, editing, and deleting financial transactions
- Categorizing expenses and income
- Creating and managing expense groups
- Tracking shared expenses between group members
- Monitoring individual contributions within groups
- Simplifying settlements between users
- Viewing transaction history
- Filtering and organizing transactions
- Persistent data storage using a relational database
- Communication between frontend and backend through REST API

## Technologies Used

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- JWT Authentication
- Uvicorn

### Frontend

- React
- TypeScript
- HTML
- CSS

### Tools

- Git
- Docker
- VS Code
- PostgreSQL

## Architecture

The application follows a client-server architecture consisting of two main parts:

- **Frontend** — React application responsible for user interaction and communication with the backend.
- **Backend** — FastAPI application providing REST API endpoints, handling business logic, authentication, and database operations.

The backend uses SQLAlchemy as an ORM layer for communication with the PostgreSQL database, while Pydantic models are used for data validation and API schemas.

## Security

The application uses JWT (JSON Web Token) authentication to protect user data.

After successful authentication, the user receives an access token that is required when accessing protected API endpoints. This ensures that each user can only manage their own financial records.
