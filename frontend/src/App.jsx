import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// Route-level code splitting with auto-retry on new deployment chunk mismatch
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_force_refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page_has_been_force_refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

const StudentLoginPage = lazyWithRetry(() => import('./pages/StudentLoginPage'));
const StudentDashboardPage = lazyWithRetry(() => import('./pages/StudentDashboardPage'));
const QuizListPage = lazyWithRetry(() => import('./pages/QuizListPage'));
const QuizAttemptPage = lazyWithRetry(() => import('./pages/QuizAttemptPage'));
const ResultPage = lazyWithRetry(() => import('./pages/ResultPage'));
const StudentAssignmentsPage = lazyWithRetry(() => import('./pages/StudentAssignmentsPage'));
const StudentNotesPage = lazyWithRetry(() => import('./pages/StudentNotesPage'));
const StudentLecturesPage = lazyWithRetry(() => import('./pages/StudentLecturesPage'));
const StudentAttendancePage = lazyWithRetry(() => import('./pages/StudentAttendancePage'));

const AdminLoginPage = lazyWithRetry(() => import('./pages/AdminLoginPage'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const CreateQuizPage = lazyWithRetry(() => import('./pages/CreateQuizPage'));
const EditQuizPage = lazyWithRetry(() => import('./pages/EditQuizPage'));
const ManageQuestionsPage = lazyWithRetry(() => import('./pages/ManageQuestionsPage'));
const ManageStudentsPage = lazyWithRetry(() => import('./pages/ManageStudentsPage'));
const AdminResultsPage = lazyWithRetry(() => import('./pages/AdminResultsPage'));
const ManageAssignmentsPage = lazyWithRetry(() => import('./pages/ManageAssignmentsPage'));
const AssignmentSubmissionsPage = lazyWithRetry(() => import('./pages/AssignmentSubmissionsPage'));
const ManageNotesPage = lazyWithRetry(() => import('./pages/ManageNotesPage'));
const ManageCampusesPage = lazyWithRetry(() => import('./pages/ManageCampusesPage'));
const ManageLecturesPage = lazyWithRetry(() => import('./pages/ManageLecturesPage'));
const ManageAttendancePage = lazyWithRetry(() => import('./pages/ManageAttendancePage'));

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
