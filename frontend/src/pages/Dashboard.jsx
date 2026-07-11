import { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle
} from 'lucide-react';
import { residentApi, visitorApi } from '../services/api';
import { getSocket } from '../services/socket';

export default function Dashboard() {
  const [data, setData] = useState({
    totalVisitorsToday: 0,
    checkedInVisitors: 0,
    checkedOutVisitors: 0,
    pendingApprovals: 0,
    totalResidents: 0,
    pendingAlerts: 0,
    recentVisitors: []
  });
  const [hourlyData, setHourlyData] = useState([0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const residents = await residentApi.getAll();
      const visitorsList = await visitorApi.getAll();

      const todayString = new Date().toDateString();
      const todayVisitors = visitorsList.filter(v => new Date(v.createdAt).toDateString() === todayString);

      const totalVisitorsToday = todayVisitors.length;
      const checkedInVisitors = todayVisitors.filter(v => v.status === 'Checked In').length;
      const checkedOutVisitors = todayVisitors.filter(v => v.status === 'Checked Out').length;
      const pendingApprovals = todayVisitors.filter(v => v.status === 'Pending').length;

      let pendingAlerts = 0;
      residents.forEach(r => {
        if (r.distressStatus === 'Active') {
          pendingAlerts += 1;
        }
      });

      const buckets = [0, 0, 0, 0, 0, 0];
      visitorsList.forEach(v => {
        if (v.checkedInAt) {
          const hr = new Date(v.checkedInAt).getHours();
          const idx = Math.floor(hr / 4);
          buckets[idx]++;
        }
      });
      setHourlyData(buckets);

      const recent = visitorsList.slice(0, 4);

      setData({
        totalVisitorsToday,
        checkedInVisitors,
        checkedOutVisitors,
        pendingApprovals,
        totalResidents: residents.length,
        pendingAlerts,
        recentVisitors: recent
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Dashboard | GatePass Pro';
    loadData();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => {
        loadData();
      };

      socket.on('distress_alert', handleUpdate);
      socket.on('distress_resolved', handleUpdate);
      socket.on('visitor_approval_changed', handleUpdate);
      socket.on('visitor_check_status', handleUpdate);

      return () => {
        socket.off('distress_alert', handleUpdate);
        socket.off('distress_resolved', handleUpdate);
        socket.off('visitor_approval_changed', handleUpdate);
        socket.off('visitor_check_status', handleUpdate);
      };
    }
  }, []);

  const stats = [
    {
      label: 'Total Visitors Today',
      value: loading ? '...' : data.totalVisitorsToday.toString(),
      icon: <Users size={22} />,
      color: 'var(--primary)',
      bg: 'var(--primary-light)'
    },
    {
      label: 'Checked-In Visitors',
      value: loading ? '...' : data.checkedInVisitors.toString(),
      icon: <UserCheck size={22} />,
      color: 'var(--success)',
      bg: 'var(--success-light)'
    },
    {
      label: 'Checked-Out Visitors',
      value: loading ? '...' : data.checkedOutVisitors.toString(),
      icon: <CheckCircle size={22} />,
      color: 'var(--text-muted)',
      bg: 'var(--border)'
    },
    {
      label: 'Pending Approvals',
      value: loading ? '...' : data.pendingApprovals.toString(),
      icon: <Clock size={22} />,
      color: 'var(--warning)',
      bg: 'var(--warning-light)'
    },
    {
      label: 'Total Residents',
      value: loading ? '...' : data.totalResidents.toString(),
      icon: <Users size={22} />,
      color: 'var(--primary)',
      bg: 'var(--primary-light)'
    },
    {
      label: 'Pending Alerts',
      value: loading ? '...' : data.pendingAlerts.toString(),
      icon: <AlertTriangle size={22} />,
      color: data.pendingAlerts > 0 ? 'var(--accent)' : 'var(--success)',
      bg: data.pendingAlerts > 0 ? 'var(--accent-light)' : 'var(--success-light)'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

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
          </div>
        ))}
      </div>

      <div className="content-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '20px' }}>
          Busiest Entry Hours Analytics
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px', padding: '10px 20px', borderBottom: '1.5px solid var(--border)', gap: '15px' }}>
            {['00:00–04:00', '04:00–08:00', '08:00–12:00', '12:00–16:00', '16:00–20:00', '20:00–00:00'].map((label, idx) => {
              const val = hourlyData[idx] || 0;
              const maxVal = Math.max(...hourlyData, 1);
              const heightPct = (val / maxVal) * 100;
              return (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)' }}>{val}</span>
                  <div style={{
                    width: '100%',
                    height: `${heightPct}%`,
                    minHeight: val > 0 ? '8px' : '2px',
                    background: 'linear-gradient(to top, var(--primary), var(--primary-hover))',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.5s ease-out'
                  }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                Recent Check-Ins
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Latest visitor entries and exits recorded across gates.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {data.recentVisitors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
                No visitor logs recorded yet.
              </div>
            ) : (
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
                  {data.recentVisitors.map((visitor) => {
                    const initials = visitor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <tr key={visitor._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'var(--transition)' }}>
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
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{visitor.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{visitor.mobile}</div>
                          </div>
                        </td>

                        <td style={{ padding: '16px 0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.875rem' }}>{visitor.type}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} />
                              Flat {visitor.flatNo}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '16px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Clock size={14} />
                            <span>{new Date(visitor.checkedInAt || visitor.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        <td style={{ padding: '16px 0' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor:
                              visitor.status === 'Checked In' ? 'var(--success-light)' :
                                visitor.status === 'Checked Out' ? 'var(--border)' :
                                  'var(--warning-light)',
                            color:
                              visitor.status === 'Checked In' ? 'var(--success)' :
                                visitor.status === 'Checked Out' ? 'var(--text-muted)' :
                                  'var(--warning)',
                          }}>
                            {visitor.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
      </div>

    </div>
  );
}
