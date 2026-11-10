# High-Concurrency Quiz Load Test & Production Tuning Guide

## 1. Concurrency Architecture Implemented
To support **100+ students logging in and attempting the same quiz simultaneously** on Vercel Serverless + MongoDB Atlas without slowdowns or duplicate submissions:

1. **Global Serverless MongoDB Connection Pool (`backend/config/db.js`)**:
   - Reuses `global.mongoose` across warm serverless invocations.
   - Configured `maxPoolSize: 15`, `minPoolSize: 1`, `serverSelectionTimeoutMS: 8000`, `socketTimeoutMS: 45000`, `bufferCommands: false`.
2. **In-Memory Short-TTL Quiz Bundle Cache (`backend/utils/cache.js`)**:
   - When 100 students click **Start Quiz** at the same second, `getCachedQuizAndQuestions(quizId)` caches the `Quiz` and `Question` documents in memory for 15 seconds.
   - Reduces 200 database reads (`100 × Quiz.findById` + `100 × Question.find`) to **2 database reads** per serverless instance.
3. **Single-Request Quiz Start + Server-Side Grading**:
   - `GET /api/student/quiz/:quizId/:studentId` returns the quiz metadata, shuffled questions **with `correctAnswer` and `explanation` stripped**, and the server-side `attempt` (`startedAt`, `remainingSeconds`, `draftAnswers`).
   - Evaluation happens strictly on the server during `POST /api/student/submit`.
4. **Resilient Client State + Debounced Autosave**:
   - Answers are saved immediately to `localStorage` (`quiz_draft_<quizId>_<studentId>`) on every click.
   - Debounced background sync (`PUT /api/student/quiz/:quizId/autosave`) runs every 6 seconds only when answers have changed, using a single `Result.updateOne`.
5. **Idempotent Submission & Compound Indexes**:
   - Unique index on `{ studentId: 1, quizId: 1, attemptNo: 1 }`.
   - If a student double-clicks Submit or a timeout race occurs, `submitQuiz` returns the already-graded result (`200 OK`) idempotently.
6. **Eliminated N+1 Queries**:
   - `GET /api/student/quizzes/:studentId` fetches all quizzes and all student attempt statuses in 2 batch queries instead of firing N+1 `check-attempt` HTTP calls.
   - `GET /api/quizzes` aggregates question counts and attempt counts via `$group`.

## 2. Running the 100-Student k6 Load Test
1. Install [k6](https://k6.io/docs/get-started/installation/).
2. Run the script against your local or staging environment:
   ```bash
   k6 run -e API_BASE_URL=http://localhost:5000/api -e QUIZ_ID=<your_quiz_id> backend/load-test/quiz-100-users.k6.js
   ```

## 3. Production Recommendations (Vercel + MongoDB Atlas)
- **Region Co-Location**: Set your Vercel Serverless Function region (e.g. `iad1` US East or `sin1` Singapore in `vercel.json`) to match your **MongoDB Atlas cluster region** so each DB round-trip is `< 5ms` instead of `150ms+`.
- **MongoDB Atlas Tier**:
  - **M0 (Free Tier)** supports 500 max connections and works well for 100 concurrent students with our `maxPoolSize: 15` and in-memory quiz caching.
  - **M10+** is recommended if running multiple campuses (500+ simultaneous students) with dedicated IOPS and point-in-time backups.
