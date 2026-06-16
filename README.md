# Quiz Portal System 

A comprehensive, production-ready Quiz Management System built with the MERN stack. It features separate portals for Admins and Students. Admins can manage quizzes and view analytics, while students can take quizzes securely with anti-cheat measures.

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 (via Vite)
- **Styling:** Tailwind CSS v3.4, PostCSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **HTTP Client:** Axios
- **Notifications:** React Hot Toast

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Middleware:** CORS, Express Async Handler

---

## 📂 Project Structure

The repository is structured as a monorepo containing both the frontend and backend:

```text
quiz-portal/
├── backend/                # Node.js & Express API
│   ├── config/             # Database & environment configurations
│   ├── controllers/        # Request handlers & business logic
│   ├── middleware/         # Custom Express middleware (e.g., Auth)
│   ├── models/             # Mongoose database schemas
│   ├── routes/             # API route definitions
│   └── server.js           # Application entry point
├── frontend/               # React Application
│   ├── public/             # Static assets
│   ├── src/                # React components, pages, and API hooks
│   ├── index.html          # HTML entry point
│   └── vite.config.js      # Vite bundler configuration
└── README.md               # Project documentation
```

## ✨ Key Features

### For Students
- **Real-time Quiz Attempt:** Smooth, dynamic interface powered by Framer Motion.
- **Randomization:** Questions and multiple-choice options are shuffled per attempt to prevent cheating.
- **Auto-Submission:** Timers automatically submit the quiz when time runs out.
- **Anti-Cheat Mechanisms:** Prevents page refreshing during an active attempt.
- **Instant Results:** Immediate feedback and scores after submission.

### For Admins
- **Quiz Management:** Create and edit quizzes with Multiple Choice (MCQ) and Short Answer formats.
- **Smart Validation:** Case-insensitive exact matching for short answer grading.
- **Analytics Dashboard:** View detailed logs of all attempts and filter results by specific quizzes.
- **Secure Access:** Protected routes requiring JWT authentication.

---

## 🛠️ Local Development Setup

### 1. Database Setup
Ensure you have MongoDB installed locally or create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

### 2. Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create or verify your `.env` file based on `.env.example`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/quiz-portal
   JWT_SECRET=your_super_secret_jwt_key
   NODE_ENV=development
   ```
3. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```

### 3. Frontend Configuration
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Ensure your `.env` contains the backend API URL (if required by your configuration, default is often handled in `api.js` or `.env`):
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
3. Install dependencies and start the Vite development server:
   ```bash
   npm install
   npm run dev
   ```
4. Access the application at `http://localhost:5173`.

---

## 🔐 Admin Initialization

To create the initial Admin account, send a POST request to `/api/admin/register` using Postman, cURL, or ThunderClient:

```json
{
  "email": "admin@portal.com",
  "password": "password123"
}
```

> **⚠️ Security Warning:** In a production environment, ensure this route is disabled, protected, or heavily rate-limited to prevent unauthorized admin creation.

---

## ☁️ Deployment Guide

### Backend (Render / Railway / Heroku)
1. Push the `backend` folder to your Git repository.
2. Connect your repository to your hosting provider.
3. Configure the **Environment Variables** (`MONGO_URI`, `JWT_SECRET`, etc.).
4. **Build Command:** `npm install`
5. **Start Command:** `npm start` (Runs `node server.js`)

### Frontend (Vercel / Netlify)
1. Ensure the API base URL in your frontend (e.g., `src/api.js` or `.env.production`) points to your newly deployed backend URL.
2. Push the `frontend` folder to your Git repository.
3. Connect the repository to Vercel/Netlify.
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`

---
*Developed with modern web technologies for a seamless educational experience.*
