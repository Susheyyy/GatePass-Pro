import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/residents" element={
          <ProtectedRoute>
            <Layout>
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