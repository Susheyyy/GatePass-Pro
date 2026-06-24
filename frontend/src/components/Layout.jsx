import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldAlert, LogOut, Shield, Bell, CheckCircle2 } from 'lucide-react';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('gatepass_token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/residents', label: 'Residents', icon: <Users size={18} /> },
    { path: '/visitors', label: 'Visitors', icon: <ShieldAlert size={18} /> },
  ];

  return (
    <div className="layout-wrapper">
      <header className="main-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', 
            color: 'white', 
            padding: '8px', 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Shield size={20} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', color: 'var(--text-main)' }}>
            GatePass <span style={{ color: 'var(--primary)' }}>Pro</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Bell size={20} />
            <span style={{ 
              position: 'absolute', 
              top: '-2px', 
              right: '-2px', 
              width: '8px', 
              height: '8px', 
              backgroundColor: 'var(--accent)', 
              borderRadius: '50%',
              border: '2px solid white'
            }}></span>
          </button>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #a855f7, #6366f1)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}>
              AD
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.2 }}>Admin Portal</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>admin@gatepass.com</div>
            </div>
          </div>
        </div>
      </header>

      <div className="layout-body">
        <aside className="sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
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
          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* System Status Display */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 12px', 
              backgroundColor: 'var(--success-light)', 
              borderRadius: '8px',
              color: 'var(--success)',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}>
              <CheckCircle2 size={14} />
              <span>System Online</span>
              <span className="pulse-dot" style={{
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--success)',
                borderRadius: '50%',
                marginLeft: 'auto',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.4)',
                animation: 'pulse 1.5s infinite'
              }}></span>
            </div>

            <button 
              onClick={handleLogout} 
              className="sidebar-link" 
              style={{ 
                width: '100%', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                color: 'var(--accent)',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="content-frame">
          <div className="app-container">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  );
}