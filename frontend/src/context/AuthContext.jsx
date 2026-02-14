import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('adminData');
    if (storedAdmin) {
      setAdmin(JSON.parse(storedAdmin));
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    setAdmin(data);
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminData', JSON.stringify(data));
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
