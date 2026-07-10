import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Student Pages
import StudentLoginPage from './pages/StudentLoginPage';
import QuizListPage from './pages/QuizListPage';
import QuizAttemptPage from './pages/QuizAttemptPage';
import ResultPage from './pages/ResultPage';
import StudentAssignmentsPage from './pages/StudentAssignmentsPage';
import StudentNotesPage from './pages/StudentNotesPage';

// Admin Pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import CreateQuizPage from './pages/CreateQuizPage';
import EditQuizPage from './pages/EditQuizPage';
import ManageQuestionsPage from './pages/ManageQuestionsPage';
import ManageStudentsPage from './pages/ManageStudentsPage';
import AdminResultsPage from './pages/AdminResultsPage';
import ManageAssignmentsPage from './pages/ManageAssignmentsPage';
import AssignmentSubmissionsPage from './pages/AssignmentSubmissionsPage';
import ManageNotesPage from './pages/ManageNotesPage';
import ManageCampusesPage from './pages/ManageCampusesPage';
import BarcodeGeneratorPage from './pages/BarcodeGeneratorPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Student Routes */}
          <Route path="/" element={<StudentLoginPage />} />
          <Route path="/quizzes" element={<QuizListPage />} />
          <Route path="/quiz/attempt/:quizId" element={<QuizAttemptPage />} />
          <Route path="/result/:resultId" element={<ResultPage />} />
          <Route path="/student-assignments" element={<StudentAssignmentsPage />} />
          <Route path="/student-notes" element={<StudentNotesPage />} />

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
            path="/admin/barcode-generator" 
            element={
              <ProtectedRoute>
                <BarcodeGeneratorPage />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
