# BanoQabil Web Development LMS Portal

Production-ready MERN Learning Management System (LMS) for Web Development cohorts, deployed as two independent projects (`frontend` and `backend`) on Vercel.

---

## Architecture & Modules

- **Multi-Admin Tenant Isolation**: Each administrator/instructor manages their own Campuses, Batches, Students, Quizzes, Video Lectures, Attendance Sessions, Assignments, and Lecture Notes (`addedBy` / `createdBy` scoping).
- **Phase 1 — Bulk Student Import, Auto Credentials & Chunked Bulk Email**:
  - Upload `.xlsx` or `.csv` files with flexible header mapping (`Name`, `Student ID`, `Email`, `Campus`, `Batch`, `Contact`).
  - Client-side validation preview table (detects duplicate Student IDs, invalid emails, missing fields, and unknown campus/batch) before `bulkWrite({ ordered: false })`.
  - Auto-generates an 8–10 character password per student (excludes ambiguous characters `0/O/l/1`), stores only the bcrypt hash (`passwordHash`), shows plain passwords once at creation/reset, and sets `mustChangePassword: true` for first-login password change.
  - Chunked bulk email sender (`20` students per request) with live progress bar, supporting **Resend API** or **Nodemailer SMTP**, tracking per-student `emailStatus` (`pending`, `sent`, `failed`) with one-click retry for failed recipients.
- **Phase 2 — High-Concurrency Quiz System & Bulk MCQ Upload**:
  - Bulk MCQ upload via `.xlsx`/`.csv` (`Question`, `Option A–E`, `Correct Option`, `Marks`, `Explanation`) with downloadable template (`/templates/mcq_import_template.xlsx`), preview validation, plus manual question add/edit/delete.
  - Quiz settings: Campus/Batch targeting, start/end window, duration, question & option shuffling, allowed attempts, publish/unpublish, one-click quiz duplication, and Excel result export.
  - **100-Concurrent-Student Engineering**:
    - Global cached MongoDB connection pool (`maxPoolSize: 25`), compound indexes, short-TTL in-memory quiz bundle cache (`15s`), gzip compression, and rate limiting.
    - Single-request question fetch with `correctAnswer` stripped on the server.
    - Client `localStorage` + debounced periodic server autosave (`PUT /api/student/quiz/:quizId/autosave`).
    - Server-enforced timer (`startedAt` stored on `Result`) and idempotent submission (`unique` compound index on `{ studentId, quizId, attemptNo }`).
    - Includes k6 load test script (`backend/load-test/quiz-100-users.k6.js`) and architecture report (`backend/load-test/LOAD_TEST_REPORT.md`).
- **Phase 3 — Video Lecture Management & Embedded Media Player**:
  - Admins publish lectures with module grouping, ordering, Campus/Batch visibility, resource links, and YouTube or Google Drive video URLs.
  - Responsive 16:9 custom-styled embedded player (`StudentLecturesPage.jsx`) with lazy-loaded iframe, module playlist, Next/Previous navigation, and watched progress synchronization.
- **Phase 4 — Lecture-Wise Attendance**:
  - Admins create class sessions (`date`, `time`, `lectureTitle`, `campus`, `batch`), mark students (`Present`, `Absent`, `Late`, `Leave`) with **Mark All Present**, and save in a single `bulkWrite`.
  - Filterable attendance summary reports with Excel export and student-facing attendance progress dashboard.
- **Phase 5 — Assignment System Polish**:
  - Supports File Upload, External URL/GitHub Link, or built-in Web IDE (`HTML`/`CSS`/`JS`) submissions.
  - Clear status badges (`pending`, `submitted`, `late`, `graded`), maximum marks, and admin grading with numeric marks and written feedback.
  - Eliminates N+1 status requests by returning each student's submission inline with the assignment list.
- **Phase 6 — Mobile-First UI/UX, Light/Dark Theme & Performance**:
  - Light and Dark theme powered by CSS variables (`--bg-primary`, `--bg-surface`, `--text-primary`, `--accent`, etc.) with zero-flash startup script in `index.html` and `localStorage` persistence.
  - Mobile-first responsive navigation and card layouts, route-level code splitting (`React.lazy` + `Suspense`), and skeleton loaders.

---

## Setup & Local Development

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, FRONTEND_URL, and email/Cloudinary credentials
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api for local development
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
| :--- | :--- | :--- |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret key for signing Admin and Student JWTs |
| `FRONTEND_URL` | Yes | Deployed frontend origin(s), comma-separated for CORS |
| `STUDENT_PORTAL_URL` | No | Login URL included in student credential emails |
| `RESEND_API_KEY` | Optional | Resend HTTP API key for transactional emails |
| `EMAIL_FROM` | Optional | Sender address (e.g. `BanoQabil LMS <noreply@domain.com>`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional | Nodemailer SMTP fallback if `RESEND_API_KEY` is not set |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional | Cloudinary credentials for file uploads |

### Frontend (`frontend/.env`)
| Variable | Required | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | Yes | Backend base URL (e.g. `https://your-backend.vercel.app`) |

---

## Deployment on Vercel (Two Separate Projects)

1. **Backend Project**:
   - Root Directory: `backend`
   - `backend/vercel.json` routes all requests to `server.js`.
   - Set all backend environment variables in Vercel Project Settings.
   - Place the Vercel Function region in the same region as your MongoDB Atlas cluster (e.g., `iad1` or `sin1`) for lowest latency during 100-student quizzes.
2. **Frontend Project**:
   - Root Directory: `frontend`
   - Framework Preset: `Vite`
   - `frontend/vercel.json` rewrites SPA routes to `/index.html`.
   - Set `VITE_API_URL` to your deployed backend URL.

---

## Database Migration & Backward Compatibility Notes

All schema additions use safe defaults so existing production documents continue working without destructive migrations:
- **`Student`**:
  - Pre-existing students without `passwordHash` can sign in using their `studentId` as initial password and are automatically prompted to set a personal password on first login (`mustChangePassword: true`).
  - `isActive` defaults to `true`; `emailStatus` defaults to `'pending'`.
- **`Quiz` & `Question`**:
  - Existing quizzes default to `isPublished: true`, `shuffleQuestions: true`, `shuffleOptions: true`, `attemptsAllowed: 1`.
- **`Result`**:
  - Existing completed quiz results default to `status: 'submitted'` and `attemptNo: 1`.
  - Unique compound index `{ studentId: 1, quizId: 1, attemptNo: 1 }` prevents duplicate submissions.
- **`Assignment` & `Submission`**:
  - Existing assignments default to `maxMarks: 100`, `submissionType: 'both'`, `isPublished: true`.

---

## Short Admin Guide

1. **Campuses & Batches**: Go to **Campuses & Batches** to create campuses and add batch codes.
2. **Bulk Student Import & Credentials**:
   - Go to **Students** -> click **Template** to download `/templates/student_import_template.xlsx`.
   - Click **Bulk Import**, select your filled `.xlsx`/`.csv`, review the validation preview table, and click **Confirm & Import**.
   - Download the one-time generated passwords CSV or use **Send Credentials** to email credentials in chunks of 20.
3. **Quizzes & Bulk MCQ Upload**:
   - Create a quiz under **Create Quiz**, then open **Manage Questions** -> **Bulk Upload MCQs** (template at `/templates/mcq_import_template.xlsx`).
   - Use **Duplicate Quiz** on the dashboard to reuse a quiz for another campus or batch.
4. **Video Lectures & Attendance**:
   - Add YouTube or Google Drive links under **Video Lectures**.
   - Record class attendance under **Attendance** -> select session -> **Mark All Present** -> toggle absentees -> **Save Attendance**.
