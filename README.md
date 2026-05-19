# UPI & Mobile Banking Registration

Problem Statement 259 full-stack project using React, Node.js, Express, REST APIs, and MySQL.

## Features

- User registration with simulated OTP verification and MPIN setup
- UPI ID creation
- Bank account linking
- Transaction limit setup
- Mandate management
- Transaction history
- QR code display
- Notifications
- Basic admin panel
- CSV export
- Postman collection for API testing

## Setup

1. Create a MySQL database:

```sql
CREATE DATABASE upi_banking;
```

2. Configure the backend:

```bash
cd server
copy .env.example .env
```

Update `.env` with your MySQL username and password.

3. Install dependencies:

```bash
npm.cmd run install:all
```

4. Run the project:

```bash
npm.cmd run dev
```

- React frontend: `http://localhost:5173`
- Express API: `http://localhost:5000`

The backend creates required MySQL tables automatically when it starts.

## Postman

Import `postman/UPI-Mobile-Banking.postman_collection.json` into Postman and test the REST APIs.

## Frontend Deployment On Vercel

This repository includes `vercel.json` for deploying only the React frontend.

Set this Vercel environment variable before deployment:

```bash
VITE_API_URL=https://your-backend-url.com/api
```

For local testing, keep:

```bash
VITE_API_URL=http://localhost:5000/api
```

The backend uses Express and MySQL, so it needs a running MySQL database and a backend host that supports long-running Node.js APIs or serverless MySQL connections.
