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
  MapPin
} from 'lucide-react';
import { residentApi, visitorApi } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState({
    activeVisitors: 0,
    totalResidents: 0,
    pendingAlerts: 0,
    recentVisitors: []
  });
  const [loading, setLoading] = useState(true);

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

        </div>

      </div>

    </div>
  );
}