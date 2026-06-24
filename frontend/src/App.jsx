import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import ResidentDashboard from './pages/ResidentDashboard';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function HomeRedirect() {
  const role = localStorage.getItem('gatepass_role') || 'admin';
  if (role === 'resident') {
    return <Navigate to="/resident-dashboard" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

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
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}