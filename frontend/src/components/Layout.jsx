import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldAlert, LogOut, Bell, User, MessageSquare, Trash2, Car, ChevronLeft, ChevronRight, Menu, Truck, FileText } from 'lucide-react';
import { notificationApi, residentApi, visitorApi, getUserInfo } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AVATAR_MAP = {
  avatar1: { emoji: '👤', bg: 'linear-gradient(135deg, #6366f1, #a855f7)' },
  avatar2: { emoji: '👨‍💼', bg: 'linear-gradient(135deg, #f59e0b, #e11d48)' },
  avatar3: { emoji: '👩‍💼', bg: 'linear-gradient(135deg, #10b981, #059669)' },
  avatar4: { emoji: '🧑‍💻', bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }
};

const playAlarmSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc1.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.5);
    osc1.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 1.0);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    
    setTimeout(() => {
      osc1.stop();
      osc2.stop();
      audioCtx.close();
    }, 1500);
  } catch (err) {
    console.error('Audio Context Error:', err);
  }
};

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { flatNo, role: userRole, email: residentEmail } = getUserInfo();
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [distressBanners, setDistressBanners] = useState([]);
  const [avatar, setAvatar] = useState('avatar1');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    localStorage.getItem('sidebar_collapsed') === 'true'
  );


  const handleLogout = () => {
    sessionStorage.removeItem('gatepass_token');
    navigate('/login');
  };

  const fetchNotifications = async () => {
    try {
      const list = await notificationApi.getAll(userRole, userRole === 'admin' ? '' : flatNo);
      setNotifications(list);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    const loadAvatar = () => {
      if (userRole === 'resident') {
        residentApi.getAll().then(list => {
          const current = list.find(r => r.email.toLowerCase() === residentEmail?.toLowerCase() || r.gmail.toLowerCase() === residentEmail?.toLowerCase());
          if (current && current.avatar) {
            setAvatar(current.avatar);
          }
        }).catch(() => {});
      }
    };

    loadAvatar();
    window.addEventListener('profile_updated', loadAvatar);

    let socket;
    if (userRole === 'admin' || userRole === 'security' || (userRole === 'resident' && flatNo)) {
      if (userRole === 'admin' || (userRole === 'resident' && flatNo)) {
        fetchNotifications();
      }

      socket = connectSocket(userRole, flatNo);

      if (socket) {
        socket.on('new_notification', (newNotif) => {
          setNotifications(prev => [newNotif, ...prev]);
        });

        if (userRole === 'admin') {
          socket.on('distress_alert', (data) => {
            setDistressBanners(prev => {
              const exists = prev.some(b => b.residentId === data.residentId);
              if (exists) {
                return prev.map(b => b.residentId === data.residentId ? data : b);
              }
              return [...prev, data];
            });
            playAlarmSound();
          });

          socket.on('distress_resolved', (data) => {
            setDistressBanners(prev => prev.filter(b => b.residentId !== data.residentId));
          });
        }
      }
    }

    return () => {
      window.removeEventListener('profile_updated', loadAvatar);
      if (socket) {
        socket.off('new_notification');
        if (userRole === 'admin') {
          socket.off('distress_alert');
          socket.off('distress_resolved');
        }
      }
      disconnectSocket();
    };
  }, [userRole, flatNo, residentEmail]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navItems = userRole === 'admin'
    ? [
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { path: '/residents', label: 'Residents', icon: <Users size={18} /> },
        { path: '/visitors', label: 'Visitors', icon: <ShieldAlert size={18} /> },
        { path: '/delivery-entry', label: 'Delivery Entry', icon: <Truck size={18} /> },
        { path: '/daily-report', label: 'Daily Report', icon: <FileText size={18} /> },
        { path: '/vehicles', label: 'Vehicle Directory', icon: <Car size={18} /> },
        { path: '/community', label: 'Community', icon: <MessageSquare size={18} /> },
        { path: '/profile', label: 'My Profile', icon: <User size={18} /> }
      ]
    : userRole === 'security'
    ? [
        { path: '/visitors', label: 'Visitors', icon: <ShieldAlert size={18} /> },
        { path: '/delivery-entry', label: 'Delivery Entry', icon: <Truck size={18} /> },
        { path: '/daily-report', label: 'Daily Report', icon: <FileText size={18} /> },
        { path: '/vehicles', label: 'Vehicle Directory', icon: <Car size={18} /> },
        { path: '/profile', label: 'My Profile', icon: <User size={18} /> }
      ]
    : [
        { path: '/resident-dashboard', label: 'Resident Dashboard', icon: <LayoutDashboard size={18} /> },
        { path: '/vehicles', label: 'Vehicle Directory', icon: <Car size={18} /> },
        { path: '/community', label: 'Community', icon: <MessageSquare size={18} /> },
        { path: '/profile', label: 'My Profile', icon: <User size={18} /> }
      ];

  return (
    <div className="layout-wrapper">
      {distressBanners.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '600px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 99999
        }}>
          {distressBanners.map(banner => (
            <div key={banner.residentId} style={{
              backgroundColor: '#DC2626',
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.4)',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'pulse 1s infinite'
                }}>
                  <ShieldAlert size={26} color="white" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Emergency Distress Active
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', opacity: 0.95, fontWeight: '500' }}>
                    Resident <strong>{banner.name}</strong> from <strong>Flat {banner.flatNo}</strong> is requesting immediate assistance.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDistressBanners(prev => prev.filter(b => b.residentId !== banner.residentId))}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '8px 16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}
      <header className="main-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => {
              const newState = !isSidebarCollapsed;
              setIsSidebarCollapsed(newState);
              localStorage.setItem('sidebar_collapsed', newState);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-light)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em', color: 'var(--text-main)', cursor: 'pointer', margin: 0 }}>
              GatePass <span style={{ color: 'var(--primary)' }}>Pro</span>
            </h1>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                borderRadius: '50%',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--bg-card)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '320px',
                maxHeight: '400px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-premium)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'fadeInUp 0.2s ease-out'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0,0,0,0.02)'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)' }}>Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await notificationApi.clearAll(userRole, flatNo);
                          setNotifications([]);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={async () => {
                          if (!n.isRead) {
                            try {
                              await notificationApi.markAsRead(n._id);
                              setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '10px',
                          backgroundColor: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.03)',
                          transition: 'var(--transition)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.03)'}
                      >
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          marginTop: '6px',
                          backgroundColor:
                            n.type === 'community' ? 'var(--primary)' :
                            n.type === 'visitor_checkin' ? 'var(--success)' :
                            n.type === 'visitor_checkout' ? 'var(--text-muted)' :
                            n.type === 'distress_reply' ? 'var(--accent)' : '#f59e0b',
                          flexShrink: 0
                        }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: n.isRead ? '600' : '800', color: 'var(--text-main)' }}>
                            {n.title}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                            {n.message}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginTop: '2px' }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              background: userRole === 'admin' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : userRole === 'security' ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : (AVATAR_MAP[avatar]?.bg || 'linear-gradient(135deg, #10b981, #6366f1)'), 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: userRole === 'resident' ? '1.15rem' : '0.85rem'
            }}>
              {userRole === 'admin' ? 'AD' : userRole === 'security' ? 'SE' : (AVATAR_MAP[avatar]?.emoji || 'RS')}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.2 }}>
                {userRole === 'admin' ? 'Admin Portal' : userRole === 'security' ? 'Security Portal' : 'Resident Portal'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {userRole === 'admin' ? 'admin@gatepass.com' : userRole === 'security' ? 'security@gatepass.com' : residentEmail}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="layout-body">
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>

          
          <div className="sidebar-nav-links">
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
          
          <div className="sidebar-logout-container">



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
