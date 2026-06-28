import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('gatepass_token');
  const isAuthenticated = token && token !== 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}