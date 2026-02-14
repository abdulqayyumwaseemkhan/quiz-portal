import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!admin) return <Navigate to="/admin/login" />;

  return children;
};

export default ProtectedRoute;
