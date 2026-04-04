# DCLA Loan Solutions - Lending Management System

A comprehensive web application for managing loan applications, built with modern technologies and following best practices.

## 🚀 Tech Stack

### Backend

- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **MVC** architecture pattern
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend

- **React 19** with TypeScript
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **React Query** for state management
- **Vite** for build tooling
- **Feature-based** folder structure

## 📁 Project Structure

```
DCLA Loan Solutions/
├── server/                 # Backend API
│   ├── config/            # Database configuration
│   ├── controllers/       # MVC Controllers
│   ├── middleware/        # Authentication & validation
│   ├── models/           # MVC Models
│   ├── routes/           # API Routes
│   ├── scripts/          # Database migrations & seeding
│   └── index.js          # Server entry point
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts
│   │   ├── features/     # Feature-based modules
│   │   │   ├── auth/     # Authentication feature
│   │   │   └── loans/    # Loans management feature
│   │   ├── pages/        # Page components
│   │   └── App.tsx       # Main app component
│   └── package.json
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE dcla_loans;
```

2. Copy the environment file and configure it:

```bash
cd server
cp env.example .env
```

3. Update the `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dcla_loans
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
```

### 2. Backend Setup

1. Install dependencies:

```bash
cd server
npm install
```

2. Run database migrations:

```bash
npm run db:migrate
```

3. Seed the database with sample data:

```bash
npm run db:seed
```

4. Start the development server:

```bash
npm run dev
```

The backend will be running on `http://localhost:5000`

### 3. Frontend Setup

1. Install dependencies:

```bash
cd client
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update the `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:

```bash
npm run dev
```

The frontend will be running on `http://localhost:5173`

## 📊 Sample Data

After running the seed script, you'll have access to:

### Users

- **Admin**: `admin@dcla.com` / `admin123`
- **User 1**: `john.doe@example.com` / `password123`
- **User 2**: `jane.smith@example.com` / `password123`
- **User 3**: `mike.johnson@example.com` / `password123`

### Sample Loans

- 1 approved personal loan
- 1 pending business loan
- 1 rejected auto loan
- 1 pending mortgage loan

## 🔐 Authentication

The system uses JWT tokens for authentication. Users can:

- Register new accounts
- Login with email/password
- Update their profile
- Change passwords
- Access role-based features

## 🏦 Loan Management Features

### For Users

- Submit loan applications
- View their loan history
- Update pending applications
- Track application status

### For Admins

- View all loan applications
- Approve/reject applications
- Add notes to decisions
- View loan statistics
- Filter loans by status/type

## 📋 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Loans

- `POST /api/loans` - Create loan application
- `GET /api/loans/my-loans` - Get user's loans
- `GET /api/loans/:id` - Get specific loan
- `PUT /api/loans/:id` - Update loan
- `GET /api/loans` - Get all loans (admin)
- `POST /api/loans/:id/approve` - Approve loan (admin)
- `POST /api/loans/:id/reject` - Reject loan (admin)
- `GET /api/loans/stats/overview` - Get loan statistics (admin)

## 🎨 UI Features

- **Responsive Design** - Works on desktop and mobile
- **Material Design** - Modern, clean interface
- **Dark/Light Theme** - Customizable appearance
- **Data Tables** - Sortable and filterable loan data
- **Form Validation** - Real-time input validation
- **Loading States** - Smooth user experience
- **Error Handling** - User-friendly error messages

## 🔧 Development

### Backend Scripts

```bash
npm run dev          # Start development server
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
```

### Frontend Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🚀 Deployment

### Backend Deployment

1. Set up environment variables for production
2. Run database migrations
3. Build and start the Node.js application

### Frontend Deployment

1. Update API URL in environment variables
2. Build the application: `npm run build`
3. Deploy the `dist` folder to your hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.
