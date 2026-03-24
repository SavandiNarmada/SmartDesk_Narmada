# Smart Desk Assistant Backend API

This is the backend API for the Smart Desk Assistant application. It provides RESTful endpoints for managing users, devices, sensor readings, and intelligent insights.

## Technology Stack

- **Node.js** with **TypeScript**
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

Create a PostgreSQL database and run the schema:

```bash
# Create the database
createdb smart_desk_assistant

# Apply the schema
psql -d smart_desk_assistant -f database/schema.sql
```

### 3. Environment Configuration

Copy the example environment file and update with your settings:

```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- JWT secret key (use a strong random string in production)
- Port and CORS settings

### 4. Build the Application

```bash
npm run build
```

### 5. Run the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset

### Devices
- `GET /api/devices` - Get all user devices
- `POST /api/devices` - Create a new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device
- `GET /api/devices/:id/readings` - Get device sensor readings
- `POST /api/devices/:id/readings` - Add sensor reading

### Insights
- `GET /api/insights` - Get all insights
- `GET /api/insights/latest` - Get latest insight
- `GET /api/insights/device/:id` - Get insights for a specific device
- `POST /api/insights` - Create new insight

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Testing

Use tools like Postman or curl to test the API:

```bash
# Health check
curl http://localhost:3000/health

# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","full_name":"John Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Database Schema

The database consists of the following tables:
- **users** - User accounts
- **devices** - IoT devices
- **sensor_readings** - Environmental sensor data
- **insights** - System-generated insights
- **sessions** - User sessions and refresh tokens
- **user_settings** - User preferences

## Security Features

- Password hashing with bcryptjs
- JWT-based authentication
- Helmet.js for security headers
- CORS protection
- Input validation with express-validator
- SQL injection protection (parameterized queries)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   └── server.ts        # Application entry point
├── database/
│   └── schema.sql       # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## Troubleshooting

**Database connection issues:**
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure the database exists

**Port already in use:**
- Change the PORT in `.env` file

**JWT errors:**
- Ensure JWT_SECRET is set in `.env`
- Check token expiration settings

## License

MIT
