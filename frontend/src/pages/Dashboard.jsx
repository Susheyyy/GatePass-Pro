import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  FileText, 
  Radio, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  MapPin
} from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { 
      label: 'Active Visitors', 
      value: '18', 
      icon: <Users size={22} />, 
      color: 'var(--primary)', 
      bg: 'var(--primary-light)',
      trend: '+12% from morning',
      trendUp: true 
    },
    { 
      label: 'Total Residents', 
      value: '1,248', 
      icon: <UserCheck size={22} />, 
      color: 'var(--success)', 
      bg: 'var(--success-light)',
      trend: '98% active profiles',
      trendUp: true 
    },
    { 
      label: 'Gate Staff Active', 
      value: '6 / 8', 
      icon: <ShieldCheck size={22} />, 
      color: '#8b5cf6', 
      bg: 'rgba(139, 92, 246, 0.08)',
      trend: 'All shifts covered',
      trendUp: true 
    },
    { 
      label: 'Pending Alerts', 
      value: '0', 
      icon: <AlertTriangle size={22} />, 
      color: 'var(--success)', 
      bg: 'var(--success-light)',
      trend: 'System fully secure',
      trendUp: false 
    }
  ];

  const recentVisitors = [
    { id: 1, name: 'Ananya Roy', type: 'Guest', destination: 'Flat 402B', time: '11:42 PM', status: 'Checked In', avatar: 'AR' },
    { id: 2, name: 'Rohan Sharma', type: 'Delivery (Zomato)', destination: 'Flat 108A', time: '11:30 PM', status: 'Checked In', avatar: 'RS' },
    { id: 3, name: 'David Miller', type: 'Maintenance', destination: 'Clubhouse Elevators', time: '10:15 PM', status: 'Checked Out', avatar: 'DM' },
    { id: 4, name: 'Priya Patel', type: 'Guest', destination: 'Flat 305C', time: '09:00 PM', status: 'Checked Out', avatar: 'PP' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header and Welcome banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Overview Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Real-time status monitoring and society gate management control center.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-global btn-primary">
            <Plus size={18} />
            <span>Pre-Approve Guest</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '24px' 
      }}>
        {stats.map((stat, i) => (
          <div key={i} className="content-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>
                {stat.label}
              </span>
              <div style={{ 
                color: stat.color, 
                backgroundColor: stat.bg, 
                padding: '10px', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {stat.icon}
              </div>
            </div>
            
            <div>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                {stat.value}
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.8rem', 
              fontWeight: '600',
              color: stat.label === 'Pending Alerts' ? 'var(--success)' : 'var(--text-muted)'
            }}>
              {stat.trendUp && <TrendingUp size={14} style={{ color: 'var(--success)' }} />}
              <span>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Section: Recent Activity & Action Panel */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '24px' 
      }}>
        
        {/* Recent Visitors Widget */}
        <div className="content-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                Recent Check-Ins
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Latest visitor entries and exits recorded across gates.
              </p>
            </div>
            <button style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary)', 
              fontWeight: '700', 
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>View All Log history</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Visitor Info</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Purpose / Destination</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Time Recorded</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.map((visitor) => (
                  <tr key={visitor.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'var(--transition)' }}>
                    <td style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--primary-light)', 
                        color: 'var(--primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}>
                        {visitor.avatar}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{visitor.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ID Check: Verified</div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '16px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.875rem' }}>{visitor.type}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          {visitor.destination}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <Clock size={14} />
                        <span>{visitor.time}</span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 0' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        backgroundColor: visitor.status === 'Checked In' ? 'var(--success-light)' : 'var(--border)',
                        color: visitor.status === 'Checked In' ? 'var(--success)' : 'var(--text-muted)',
                      }}>
                        {visitor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / System Health Deck */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="content-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              System Command Deck
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Instant system-wide administrative broadcasts.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-global" style={{ 
                justifyContent: 'flex-start', 
                backgroundColor: 'var(--primary-light)', 
                color: 'var(--primary)',
                border: '1px solid var(--primary-border)',
                width: '100%'
              }}>
                <FileText size={18} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Export Visitor Logs</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Download daily Excel sheet</div>
                </div>
              </button>

              <button className="btn-global" style={{ 
                justifyContent: 'flex-start', 
                backgroundColor: 'var(--accent-light)', 
                color: 'var(--accent)',
                border: '1px solid rgba(244, 63, 94, 0.15)',
                width: '100%'
              }}>
                <Radio size={18} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Send Gate Alert</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Broadcast message to all tablet guards</div>
                </div>
              </button>
            </div>
          </div>

          <div className="content-card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: 'none' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
              Smart Society Info
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
              Security nodes check-in logs. 
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'white', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Main Gate Entry</span>
                <span style={{ fontWeight: '600' }}>Active (Gate A)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Service Gate</span>
                <span style={{ fontWeight: '600' }}>Locked (Gate B)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>CCTV Integration</span>
                <span style={{ fontWeight: '600', color: 'var(--success)' }}>Syncing (48/48)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}