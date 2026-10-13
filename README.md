# Lost & Found Tracker

A web-based Lost & Found management system designed to help users report, manage, and track lost and found items within an organization.

The system provides a centralized platform where users can create lost or found item reports, update item information, track item status, and manage item records through a REST API and database-backed backend.

---

## Overview

The Lost & Found Tracker aims to simplify the process of reporting and managing lost and found items.

Instead of relying on manual announcements or scattered communication channels, the platform stores item information in a structured database and allows users to manage reports through a web application.

The system is designed to support multiple organizations and users while maintaining clear ownership of each reported item.

---

## Features

### Item Management

Users can manage lost and found item records through the system.

Supported operations include:

- Create a new lost or found item
- View all reported items
- View a specific item
- Update item information
- Delete an item
- Track the current item status

Each item can contain information such as:

- Item ID
- Organization ID
- Reporter ID
- Lost / Found type
- Item name
- Category
- Location
- Description
- Photo URL
- Contact information
- Status
- Reported date
- Last updated date

---

## Core Backend API

The project provides REST API endpoints for managing item records.

Example endpoints:

```http
GET /api/items
POST /api/items
GET /api/items/{item_id}
PUT /api/items/{item_id}
DELETE /api/items/{item_id}
```

These endpoints allow the frontend and other services to communicate with the backend and database.

---

## Database Structure

The database is designed around the main Lost & Found workflow.

The core data structure connects:

```text
Organization
     │
     ├── Users
     │
     └── Items
          │
          └── Reporter
```

Each item belongs to an organization and is associated with the user who reported it.

This structure allows the system to support multiple organizations while keeping item ownership and reporting information organized.

---

## Tech Stack

### Frontend

- Next.js
- JavaScript / TypeScript
- HTML
- CSS

### Backend

- Python
- FastAPI
- REST API

### Database

- PostgreSQL

### Development & Deployment

- Docker
- Docker Compose
- Git
- GitHub

---

## Project Structure

```text
Lost_found_tracker/
│
├── acpapp/
│   ├── backend-api/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── app.py
│   │
│   ├── nextjs/
│   │
│   └── docker-compose.yml
│
├── README.md
└── ...
```

The exact structure may change as development continues.

---

## Running the Project

### 1. Clone the repository

```bash
git clone <repository-url>
```

Then enter the project directory:

```bash
cd Lost_found_tracker
```

---

### 2. Start the application with Docker

Navigate to the directory containing `docker-compose.yml`.

```bash
cd acpapp
```

Start the services:

```bash
docker compose up --build
```

Or run them in the background:

```bash
docker compose up -d --build
```

---

### 3. Check running containers

```bash
docker compose ps
```

You should see services such as:

```text
backend-api
nextjs
database
```

running successfully.

---

### 4. Check backend logs

```bash
docker compose logs backend-api
```

To follow the logs continuously:

```bash
docker compose logs -f backend-api
```

---

## API Testing

The backend API can be tested using:

- FastAPI Swagger UI
- Postman
- curl
- Browser requests
- Automated smoke tests

FastAPI automatically provides API documentation when the backend is running.

Example:

```text
http://localhost:<backend-port>/docs
```

---

## Example Item

A lost item record may look like:

```json
{
  "organization_id": 1,
  "reporter_id": 1,
  "type": "lost",
  "name": "Black Wallet",
  "category": "Personal Item",
  "location": "Library",
  "description": "Black leather wallet",
  "photo_url": null,
  "contact_info": "example@email.com",
  "status": "open"
}
```

---

## Development Workflow

Development is performed using feature branches before changes are merged into `main`.

Example workflow:

```bash
git checkout -b feature/feature-name
```

After completing the implementation:

```bash
git add .
git commit -m "Add feature description"
git push origin feature/feature-name
```

A Pull Request is then created for review before merging into the main branch.

---

## Core Item Development

The core item-management implementation was developed on:

```text
feature/nuun-core-items
```

This work includes:

- Reviewing the existing application structure
- Designing the database structure for Lost & Found items
- Extending the Item data model
- Connecting items with organizations and reporters
- Implementing Item CRUD REST API endpoints
- Testing API operations
- Running the application using Docker Compose
- Performing smoke checks before integration
- Preparing the implementation for Pull Request review

---

## Team Development

The project is developed collaboratively, with responsibilities divided across different system components such as:

- Authentication
- Database and Item CRUD
- Matching Engine
- Analytics
- Frontend
- API Integration
- Deployment

Feature branches are used to keep each member's implementation isolated until the code has been reviewed and approved.

---

## Project Status

The project is currently under active development.

Completed core components include:

- Project environment setup
- Docker-based development environment
- Database structure
- Core Item model
- Lost / Found item CRUD API
- Backend API testing
- Initial frontend/backend integration environment

Further development will focus on integrating all project components and completing the full Lost & Found workflow.

---

## Future Improvements

Planned improvements include:

- User authentication and authorization
- Image upload support
- Lost and found item matching
- Search and filtering
- Item categories
- Item status workflow
- Claim verification
- Notifications
- Analytics dashboard
- Improved frontend interface
- API integration between frontend and backend
- Production deployment

---

## Contributors

Developed as part of a collaborative university software development project.

### Core Item & Database Development

**Kullatida Raksanaves**

Responsibilities:

- Database structure
- Core Item data model
- Item CRUD API
- Backend integration
- API testing
- Docker environment verification

---

## License

This project is developed for educational purposes.
