import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((req) => {
  const isStudentEndpoint = req.url?.startsWith('/student');
  const studentToken = localStorage.getItem('studentToken');
  const adminToken = localStorage.getItem('adminToken');

  if (isStudentEndpoint && studentToken) {
    req.headers.Authorization = `Bearer ${studentToken}`;
  } else if (adminToken) {
    req.headers.Authorization = `Bearer ${adminToken}`;
  } else if (studentToken) {
    req.headers.Authorization = `Bearer ${studentToken}`;
  }

  return req;
});

export default API;
