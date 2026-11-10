import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// Route-level code splitting
const StudentLoginPage = lazy(() => import('./pages/StudentLoginPage'));
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage'));
const QuizListPage = lazy(() => import('./pages/QuizListPage'));
const QuizAttemptPage = lazy(() => import('./pages/QuizAttemptPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const StudentAssignmentsPage = lazy(() => import('./pages/StudentAssignmentsPage'));
const StudentNotesPage = lazy(() => import('./pages/StudentNotesPage'));
const StudentLecturesPage = lazy(() => import('./pages/StudentLecturesPage'));
const StudentAttendancePage = lazy(() => import('./pages/StudentAttendancePage'));

const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CreateQuizPage = lazy(() => import('./pages/CreateQuizPage'));
const EditQuizPage = lazy(() => import('./pages/EditQuizPage'));
const ManageQuestionsPage = lazy(() => import('./pages/ManageQuestionsPage'));
const ManageStudentsPage = lazy(() => import('./pages/ManageStudentsPage'));
const AdminResultsPage = lazy(() => import('./pages/AdminResultsPage'));
const ManageAssignmentsPage = lazy(() => import('./pages/ManageAssignmentsPage'));
const AssignmentSubmissionsPage = lazy(() => import('./pages/AssignmentSubmissionsPage'));
const ManageNotesPage = lazy(() => import('./pages/ManageNotesPage'));
const ManageCampusesPage = lazy(() => import('./pages/ManageCampusesPage'));
const ManageLecturesPage = lazy(() => import('./pages/ManageLecturesPage'));
const ManageAttendancePage = lazy(() => import('./pages/ManageAttendancePage'));

const PageSkeleton = () => (
  <div className="min-h-screen bg-[var(--bg-primary)] p-6">
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="h-14 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
        <div className="h-28 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
        <div className="h-28 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
      </div>
      <div className="h-72 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] animate-pulse" />
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-white">
        <AuthProvider>
          <Router>
            <Toaster position="top-right" />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                {/* Student Routes */}
                <Route path="/" element={<StudentLoginPage />} />
                <Route path="/dashboard" element={<StudentDashboardPage />} />
                <Route path="/quizzes" element={<QuizListPage />} />
                <Route path="/quiz/attempt/:quizId" element={<QuizAttemptPage />} />
                <Route path="/quiz/:quizId" element={<QuizAttemptPage />} />
                <Route path="/result/:resultId" element={<ResultPage />} />
                <Route path="/student-assignments" element={<StudentAssignmentsPage />} />
                <Route path="/student-notes" element={<StudentNotesPage />} />
                <Route path="/student-lectures" element={<StudentLecturesPage />} />
                <Route path="/student-attendance" element={<StudentAttendancePage />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-students"
                  element={
                    <ProtectedRoute>
                      <ManageStudentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-campuses"
                  element={
                    <ProtectedRoute>
                      <ManageCampusesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/create-quiz"
                  element={
                    <ProtectedRoute>
                      <CreateQuizPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/edit-quiz/:quizId"
                  element={
                    <ProtectedRoute>
                      <EditQuizPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-questions/:quizId"
                  element={
                    <ProtectedRoute>
                      <ManageQuestionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/results"
                  element={
                    <ProtectedRoute>
                      <AdminResultsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-assignments"
                  element={
                    <ProtectedRoute>
                      <ManageAssignmentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/assignments/:id/submissions"
                  element={
                    <ProtectedRoute>
                      <AssignmentSubmissionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-notes"
                  element={
                    <ProtectedRoute>
                      <ManageNotesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-lectures"
                  element={
                    <ProtectedRoute>
                      <ManageLecturesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-attendance"
                  element={
                    <ProtectedRoute>
                      <ManageAttendancePage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
