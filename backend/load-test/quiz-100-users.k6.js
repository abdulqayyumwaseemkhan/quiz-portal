/**
 * k6 Load Test — 100 Concurrent Students Attempting a Quiz Simultaneously
 *
 * Usage:
 *   k6 run -e API_BASE_URL=http://localhost:5000/api -e QUIZ_ID=<quiz_object_id> backend/load-test/quiz-100-users.k6.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('failed_requests');
const startQuizTrend = new Trend('quiz_start_duration_ms');
const submitQuizTrend = new Trend('quiz_submit_duration_ms');

export const options = {
  scenarios: {
    hundred_concurrent_students: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // Ramp up to 100 concurrent students in 10s
        { duration: '40s', target: 100 }, // Hold 100 active students answering & autosaving
        { duration: '10s', target: 0 },   // Ramp down after submission
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],      // 95% of requests must complete under 800ms
    quiz_start_duration_ms: ['p(95)<500'], // Cached quiz bundle fetch under 500ms at p95
    quiz_submit_duration_ms: ['p(95)<900'],
    failed_requests: ['rate<0.01'],        // Error rate < 1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api';
const QUIZ_ID = __ENV.QUIZ_ID || '000000000000000000000001';
const STUDENT_PREFIX = __ENV.STUDENT_PREFIX || 'BQ-LOAD-';
const DEFAULT_PASSWORD = __ENV.STUDENT_PASSWORD || 'Test@1234';

export default function () {
  const vuNumber = String(__VU).padStart(3, '0');
  const studentId = `${STUDENT_PREFIX}${vuNumber}`;
  const headers = { 'Content-Type': 'application/json' };

  // Step 1: Student Login
  const loginRes = http.post(
    `${BASE_URL}/student/login`,
    JSON.stringify({ studentId, password: DEFAULT_PASSWORD }),
    { headers }
  );

  const loggedIn = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'received JWT token': (r) => Boolean(r.json('token')),
  });
  errorRate.add(!loggedIn);

  if (!loggedIn) {
    sleep(1);
    return;
  }

  const token = loginRes.json('token');
  const studentName = loginRes.json('fullName') || `Student ${vuNumber}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Step 2: Fetch Quiz & Sanitized Questions in ONE Request
  const startRes = http.get(`${BASE_URL}/student/quiz/${QUIZ_ID}/${studentId}`, {
    headers: authHeaders,
  });
  startQuizTrend.add(startRes.timings.duration);

  const quizStarted = check(startRes, {
    'start quiz status is 200': (r) => r.status === 200,
    'questions returned without correctAnswer': (r) => {
      const qs = r.json('questions') || [];
      return Array.isArray(qs) && qs.every((q) => q.correctAnswer === undefined);
    },
  });
  errorRate.add(!quizStarted);

  if (!quizStarted) {
    sleep(1);
    return;
  }

  const questions = startRes.json('questions') || [];
  const attemptId = startRes.json('attempt._id');

  // Build simulated answers
  const userAnswers = questions.map((q) => ({
    questionId: q._id,
    answer: q.options && q.options.length > 0 ? q.options[0] : 'Sample Answer',
  }));

  sleep(2);

  // Step 3: Periodic Debounced Autosave
  const autosaveRes = http.put(
    `${BASE_URL}/student/quiz/${QUIZ_ID}/autosave`,
    JSON.stringify({
      studentId,
      attemptId,
      userAnswers: userAnswers.slice(0, Math.ceil(userAnswers.length / 2)),
    }),
    { headers: authHeaders }
  );

  check(autosaveRes, {
    'autosave status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // Step 4: Idempotent Final Submission
  const submitRes = http.post(
    `${BASE_URL}/student/submit`,
    JSON.stringify({
      studentName,
      studentId,
      quizId: QUIZ_ID,
      attemptId,
      userAnswers,
    }),
    { headers: authHeaders }
  );
  submitQuizTrend.add(submitRes.timings.duration);

  const submittedOk = check(submitRes, {
    'submit status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(!submittedOk);

  sleep(1);
}
