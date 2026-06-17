import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldAlert, LogOut } from 'lucide-react';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('gatepass_token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/residents', label: 'Residents', icon: <Users size={20} /> },
    { path: '/visitors', label: 'Visitors', icon: <ShieldAlert size={20} /> },
  ];

  return (
    <div className="layout-wrapper">
      <header className="main-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>GatePass Pro</h2>
        <div style={{ fontSize: '0.9rem' }}>Logged in as: Admin</div>
      </header>

      <div className="layout-body">
        <aside className="sidebar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <button 
            onClick={handleLogout} 
            className="sidebar-link" 
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--accent)' }}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </aside>

        <main className="content-frame">
          <div className="app-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}