import { Navigate } from 'react-router-dom';
import { getUserFromToken } from '../services/api';

export default function ProtectedRoute({ children }) {
  const user = getUserFromToken();
  return user ? children : <Navigate to="/login" replace />;
}
