# CRM Backend REST API (Lead Management System)

A robust, clean, and production-ready RESTful backend for a Customer Relationship Management (CRM) platform built with **Node.js**, **Express**, **PostgreSQL**, and **JWT Authentication**.

The system enables educational institutions and companies to capture prospective student leads through public enquiry forms and distribute them fairly among counselors through a concurrency-safe lead claiming system.

---

## 🌟 Business Logic Overview

1. **Counselor / Employee Authentication**:
   - Each counselor has an account identified by their corporate email.
   - Access to internal CRM data is protected using JSON Web Tokens (JWT).

2. **Public Enquiry Form (Unauthenticated)**:
   - Prospective clients/students fill a simple lead capture form (`Name`, `Email`, `Phone`, `Course Interest`, `Notes`).
   - The form is accessible without any authentication so it can be circulated online, embedded in landing pages, or shared by counselors over phone calls.

3. **Public / Unclaimed Enquiries Pool**:
   - Inside the CRM, counselors can browse all incoming student leads that are not yet assigned.
   - Includes full-text search, course interest filters, and pagination.

4. **Exclusive Lead Claiming**:
   - Any counselor can choose to **"Claim"** an unclaimed lead.
   - Claiming assigns the lead exclusively to that counselor, making it **private**.
   - Claimed leads **immediately disappear** from the public unclaimed pool and are only accessible by the claiming counselor.
   - **Race-Condition & Concurrency Safe**: Uses atomic database updates (`UPDATE ... WHERE id = $1 AND claimed_by IS NULL RETURNING *`) so two counselors clicking "Claim" simultaneously can never double-claim the same lead.

---

## 🏗️ Architecture & Project Structure

The project follows a clean, modular MVC structure that is easy to read, maintain, and scale:

```text
crm_A/
├── src/
│   ├── config/
│   │   ├── env.js                # Centralized environment variables & defaults
│   │   └── database.js           # PostgreSQL connection pool with error handling
│   ├── controllers/
│   │   ├── authController.js     # Counselor register, login, profile handlers
│   │   └── enquiryController.js  # Public form, lead claim, & enquiry queries
│   ├── middlewares/
│   │   ├── authMiddleware.js     # JWT verification & route protection
│   │   ├── errorMiddleware.js    # Global error & 404 handlers
│   │   └── validateMiddleware.js # express-validator error formatter
│   ├── models/
│   │   ├── userModel.js          # SQL queries for user authentication & accounts
│   │   └── enquiryModel.js       # SQL queries for lead management & atomic claims
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth endpoints
│   │   ├── enquiryRoutes.js      # /api/enquiries endpoints
│   │   └── index.js              # Aggregated API router (/api/health, /api/auth, /api/enquiries)
│   └── db/
│       ├── initDb.js             # Automatic schema & index creation on server start
│       └── seed.js               # Mock data seeder (2 counselors + 6 sample leads)
├── test/
│   └── api.test.js               # Automated integration test suite (13 passing tests)
├── .env.example                  # Environment configuration template
├── package.json                  # Dependencies & npm scripts
├── requests.http                 # VS Code REST Client ready-to-test file
├── server.js                     # Server entrypoint with graceful shutdown
└── README.md                     # Documentation
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL (with connection pooling via `pg`)
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs` for secure password hashing
- **Validation**: `express-validator` for structured request input validation
- **Logging & Security**: `morgan`, `cors`

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) running locally or in Docker

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=crm_db

JWT_SECRET=super_secret_crm_jwt_key_2026_change_in_production
JWT_EXPIRES_IN=24h
```

### 4. Seed Database (Optional but Recommended)
Populates the database with 2 counselors and realistic student enquiries:
```bash
npm run seed
```

**Pre-seeded Counselor Accounts:**
| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **John Doe** | `john.counselor@company.com` | `password123` | Counselor |
| **Sarah Smith** | `sarah.counselor@company.com` | `password123` | Counselor |

### 5. Start the Server
- **Development (with hot-reload)**:
  ```bash
  npm run dev
  ```
- **Production**:
  ```bash
  npm start
  ```
The server will automatically verify and create all required tables and indexes upon startup.

### 6. Run Automated Tests
Execute the integration test suite (runs 13 end-to-end tests validating authentication, lead capture, claiming concurrency, and privacy):
```bash
npm test
```

---

## 📚 API Reference

Base URL: `http://localhost:5000/api`

### Summary of Endpoints

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | No | Server health check |
| `POST` | `/auth/register` | No | Register a new counselor/employee account |
| `POST` | `/auth/login` | No | Login and obtain JWT token |
| `GET` | `/auth/me` | **Yes** | Get current logged-in counselor profile |
| `POST` | `/enquiries/public` | **No** | **Public Enquiry Form** to submit student lead |
| `GET` | `/enquiries/unclaimed` | **Yes** | **Fetch Unclaimed Leads** (Public pool inside CRM) |
| `POST` | `/enquiries/:id/claim` | **Yes** | **Claim a Lead** (Assign exclusively to logged-in counselor) |
| `GET` | `/enquiries/my-claims` | **Yes** | **Fetch My Claimed Leads** (Private to logged-in counselor) |
| `GET` | `/enquiries/:id` | **Yes** | View details of a specific enquiry |
| `PATCH`| `/enquiries/:id/status` | **Yes** | Update lead status (`CONTACTED`, `CONVERTED`, etc.) & notes |

---

## 🔍 Detailed Endpoint Documentation & Examples

### 1. Employee Registration
- **Endpoint**: `POST /api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Alex Vance",
  "email": "alex.vance@company.com",
  "password": "securePassword123",
  "phone": "+1-555-0199",
  "role": "counselor"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Counselor account registered successfully.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 3,
      "name": "Alex Vance",
      "email": "alex.vance@company.com",
      "phone": "+1-555-0199",
      "role": "counselor",
      "created_at": "2026-10-14T03:30:00.000Z"
    }
  }
}
```

---

### 2. Employee Login
- **Endpoint**: `POST /api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "john.counselor@company.com",
  "password": "password123"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe (Senior Counselor)",
      "email": "john.counselor@company.com",
      "phone": "+1-555-0101",
      "role": "counselor",
      "created_at": "2026-10-14T03:20:00.000Z"
    }
  }
}
```

---

### 3. Public Enquiry Form (No Authentication Required)
- **Endpoint**: `POST /api/enquiries/public`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Priya Sharma",
  "email": "priya.s@example.com",
  "phone": "+91-9876543210",
  "courseInterest": "Data Science & Machine Learning",
  "notes": "Looking for weekend batch with live projects.",
  "source": "online_form"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Your enquiry has been submitted successfully. A counselor will get in touch soon.",
  "data": {
    "enquiry": {
      "id": 8,
      "name": "Priya Sharma",
      "email": "priya.s@example.com",
      "phone": "+91-9876543210",
      "course_interest": "Data Science & Machine Learning",
      "notes": "Looking for weekend batch with live projects.",
      "source": "online_form",
      "status": "UNCLAIMED",
      "created_at": "2026-10-14T03:35:00.000Z"
    }
  }
}
```

---

### 4. Fetch Unclaimed Leads (Public Enquiries inside CRM)
- **Endpoint**: `GET /api/enquiries/unclaimed`
- **Query Parameters**:
  - `page` (optional, default: `1`)
  - `limit` (optional, default: `10`)
  - `course` (optional, filter by course interest e.g., `?course=MERN`)
  - `search` (optional, search by student name/email/phone)
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Unclaimed enquiries retrieved successfully.",
  "data": {
    "enquiries": [
      {
        "id": 8,
        "name": "Priya Sharma",
        "email": "priya.s@example.com",
        "phone": "+91-9876543210",
        "course_interest": "Data Science & Machine Learning",
        "notes": "Looking for weekend batch with live projects.",
        "source": "online_form",
        "status": "UNCLAIMED",
        "created_at": "2026-10-14T03:35:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 5. Claim a Lead
- **Endpoint**: `POST /api/enquiries/:id/claim` (also supports `PATCH`)
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Enquiry successfully claimed! It is now assigned to you and private.",
  "data": {
    "enquiry": {
      "id": 8,
      "name": "Priya Sharma",
      "email": "priya.s@example.com",
      "phone": "+91-9876543210",
      "course_interest": "Data Science & Machine Learning",
      "notes": "Looking for weekend batch with live projects.",
      "source": "online_form",
      "status": "CLAIMED",
      "claimed_by": 1,
      "claimed_at": "2026-10-14T03:36:10.000Z"
    }
  }
}
```
- **Error Response: Already Claimed by Another Counselor (409 Conflict)**:
```json
{
  "success": false,
  "message": "This enquiry has already been claimed by another counselor and is no longer public."
}
```
- **Error Response: Already Claimed by Same Counselor (400 Bad Request)**:
```json
{
  "success": false,
  "message": "You have already claimed this enquiry."
}
```

---

### 6. Fetch Leads Claimed by Logged-in Counselor (My Claims)
- **Endpoint**: `GET /api/enquiries/my-claims`
- **Query Parameters**:
  - `page` (optional)
  - `limit` (optional)
  - `status` (optional, e.g. `?status=CLAIMED` or `?status=CONTACTED`)
  - `search` (optional)
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Claimed enquiries retrieved successfully.",
  "data": {
    "enquiries": [
      {
        "id": 8,
        "name": "Priya Sharma",
        "email": "priya.s@example.com",
        "phone": "+91-9876543210",
        "course_interest": "Data Science & Machine Learning",
        "notes": "Looking for weekend batch with live projects.",
        "source": "online_form",
        "status": "CLAIMED",
        "claimed_at": "2026-10-14T03:36:10.000Z",
        "created_at": "2026-10-14T03:35:00.000Z",
        "updated_at": "2026-10-14T03:36:10.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 7. Update Lead Progress / Follow-Up Notes
- **Endpoint**: `PATCH /api/enquiries/:id/status`
- **Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "status": "CONTACTED",
  "notes": "Spoke to student on phone. Sent curriculum brochure. Demo scheduled for Friday 5 PM."
}
```
- **Allowed Status Values**: `CLAIMED`, `CONTACTED`, `FOLLOW_UP`, `CONVERTED`, `LOST`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Enquiry progress updated successfully.",
  "data": {
    "enquiry": {
      "id": 8,
      "name": "Priya Sharma",
      "email": "priya.s@example.com",
      "phone": "+91-9876543210",
      "course_interest": "Data Science & Machine Learning",
      "notes": "Spoke to student on phone. Sent curriculum brochure. Demo scheduled for Friday 5 PM.",
      "status": "CONTACTED",
      "claimed_at": "2026-10-14T03:36:10.000Z",
      "updated_at": "2026-10-14T03:38:00.000Z"
    }
  }
}
```

---

## 🔒 Security & Data Integrity Features

1. **Password Hashing**: Passwords stored using `bcryptjs` with salt round factor of 10.
2. **SQL Injection Protection**: All SQL queries use parameterized placeholders (`$1, $2, ...`).
3. **Atomic Lead Claiming**:
   ```sql
   UPDATE enquiries
   SET claimed_by = $1, claimed_at = NOW(), status = 'CLAIMED'
   WHERE id = $2 AND claimed_by IS NULL
   RETURNING *;
   ```
   Ensures absolute isolation against race conditions.
4. **Data Isolation**: A counselor cannot view or alter enquiries claimed by another counselor.
5. **Input Sanitization & Normalization**: Emails are auto-trimmed and lowercased; phone numbers validated; required fields enforced.
6. **Graceful Shutdown**: Server drains PostgreSQL pool cleanly upon receiving `SIGINT` or `SIGTERM`.

---

## 🧪 Testing with cURL / Postman / REST Client

### cURL Quick Verification

1. **Submit public enquiry**:
```bash
curl -X POST http://localhost:5000/api/enquiries/public \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Mark Otto\",\"email\":\"mark@example.com\",\"phone\":\"+1-555-4321\",\"courseInterest\":\"Cloud Computing\"}"
```

2. **Login as Counselor**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"john.counselor@company.com\",\"password\":\"password123\"}"
```

3. **Fetch Unclaimed Leads**:
```bash
curl -X GET http://localhost:5000/api/enquiries/unclaimed \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

4. **Claim a Lead**:
```bash
curl -X POST http://localhost:5000/api/enquiries/1/claim \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

5. **View My Claimed Leads**:
```bash
curl -X GET http://localhost:5000/api/enquiries/my-claims \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

Alternatively, open `requests.http` inside VS Code with the **REST Client** or **Thunder Client** extension to execute all requests with single clicks.
