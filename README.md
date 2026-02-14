# Quiz Portal System - Production Ready MERN App

## Project Overview
A complete Quiz Management System with Admin and Student portals. Admin can create MCQ and Short Answer questions, while students can attempt quizzes and see results instantly.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS v3, Framer Motion, Lucide Icons, Axios
- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Authentication:** JWT (JSON Web Tokens) for Admin

## Configuration

### 1. Backend Setup
1. Open terminal in `backend` folder.
2. Ensure you have MongoDB running locally or a URI from MongoDB Atlas.
3. Check `.env` file (one has been created for you):
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/quiz-portal
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```
4. Run commands:
   ```bash
   npm install
   npm start
   ```

### 2. Frontend Setup
1. Open terminal in `frontend` folder.
2. Run commands:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

## Admin Credentials
To create your first admin, you can use a tool like Postman or CURL to send a POST request to `/api/admin/register` with:
```json
{
  "email": "admin@portal.com",
  "password": "password123"
}
```
*Note: In production, disable this route or secure it.*

## Key Features
- **Anti-Cheat:** Prevents page refresh during attempt, auto-submits on timer end.
- **Randomization:** Questions and MCQ options are shuffled for every student attempt.
- **Validation:** Case-insensitive exact match for short answer questions.
- **Analytics:** View detailed attempts and filter results by quiz in the Admin Panel.

## Deployment Guide

### Backend (Render/Heroku/Railway)
1. Push the `backend` folder to a Git repo.
2. Set Environment Variables on the platform.
3. Build command: `npm install`
4. Start command: `node server.js`

### Frontend (Vercel/Netlify)
1. Update `baseURL` in `frontend/src/api.js` to your deployed backend URL.
2. Push `frontend` folder to Git.
3. Build command: `npm run build`
4. Output directory: `dist`
