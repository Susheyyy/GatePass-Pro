import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Plus,
  FileText,
  Radio,
  ArrowUpRight,
  Clock,
  MapPin,
  X
} from 'lucide-react';
import { residentApi, visitorApi, notificationApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState({
    activeVisitors: 0,
    totalResidents: 0,
    pendingAlerts: 0,
    recentVisitors: []
  });
  const [loading, setLoading] = useState(true);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('Gate Security Broadcast');
  const [alertMessage, setAlertMessage] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const residents = await residentApi.getAll();
        const visitorsList = await visitorApi.getAll();

        const activeVisitors = visitorsList.filter(v => v.status === 'Checked In').length;

        let pendingAlerts = 0;
        residents.forEach(r => {
          if (r.distressMessages) {
            pendingAlerts += r.distressMessages.length;
          }
        });

        const recent = visitorsList.slice(0, 4);

        setData({
          activeVisitors,
          totalResidents: residents.length,
          pendingAlerts,
          recentVisitors: recent
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const stats = [
    {
      label: 'Active Visitors',
      value: loading ? '...' : data.activeVisitors.toString(),
      icon: <Users size={22} />,
      color: 'var(--primary)',
      bg: 'var(--primary-light)'
    },
    {
      label: 'Total Residents',
      value: loading ? '...' : data.totalResidents.toString(),
      icon: <UserCheck size={22} />,
      color: 'var(--success)',
      bg: 'var(--success-light)'
    },
    {
      label: 'Gate Staff Active',
      value: '6 / 8',
      icon: <ShieldCheck size={22} />,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.08)'
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px'
      }}>

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
                            <span>{new Date(visitor.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

              <button
                onClick={() => setIsAlertModalOpen(true)}
                className="btn-global"
                style={{
                  justifyContent: 'flex-start',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(244, 63, 94, 0.15)',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <Radio size={18} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Send Gate Alert</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Broadcast message to all tablet guards</div>
                </div>
              </button>
            </div>
          </div>

        </div>

      </div>

      {isAlertModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div className="content-card" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '30px',
            position: 'relative',
            boxShadow: 'var(--shadow-premium)',
            animation: 'fadeInUp 0.25s ease-out'
          }}>
            <button
              onClick={() => setIsAlertModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.02)'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Radio size={20} style={{ color: 'var(--accent)' }} />
              <span>Broadcast Gate Alert</span>
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!alertMessage.trim() || sendingAlert) return;
                setSendingAlert(true);
                try {
                  await notificationApi.createBroadcast(alertTitle, alertMessage.trim());
                  toast.success('Gate Alert broadcasted successfully!');
                  setAlertMessage('');
                  setIsAlertModalOpen(false);
                } catch (err) {
                  toast.error('Failed to broadcast Gate Alert.');
                } finally {
                  setSendingAlert(false);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  Alert Title
                </label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  required
                  placeholder="e.g. Gate Security Broadcast"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  Broadcast Message Details <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <textarea
                  placeholder="Type the message to send to all residents and guard logs..."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'var(--text-muted)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!alertMessage.trim() || sendingAlert}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    opacity: alertMessage.trim() ? 1 : 0.6
                  }}
                >
                  {sendingAlert ? 'Sending...' : 'Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}