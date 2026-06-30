import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import ResidentDashboard from './pages/ResidentDashboard';
import Profile from './pages/Profile';
import Community from './pages/Community';
import Visitors from './pages/Visitors';
import Vehicles from './pages/Vehicles';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import { getUserFromToken } from './services/api';

function HomeRedirect() {
  const user = getUserFromToken();
  const role = user ? user.role : 'admin';
  if (role === 'resident') {
    return <Navigate to="/resident-dashboard" replace />;
  }
  if (role === 'security') {
    return <Navigate to="/visitors" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <ToastProvider>
      <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <HomeRedirect />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/residents" element={
          <ProtectedRoute>
            <Layout>
              <Residents />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/resident-dashboard" element={
          <ProtectedRoute>
            <Layout>
              <ResidentDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/visitors" element={
          <ProtectedRoute>
            <Layout>
              <Visitors />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/vehicles" element={
          <ProtectedRoute>
            <Layout>
              <Vehicles />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/community" element={
          <ProtectedRoute>
            <Layout>
              <Community />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  </ToastProvider>
  );
}