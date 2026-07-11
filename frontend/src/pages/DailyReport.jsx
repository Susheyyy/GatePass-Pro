import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, UserCheck, Clock, CheckCircle, Search, Download } from 'lucide-react';
import { visitorApi, getUserInfo } from '../services/api';
import { FormButton } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

export default function DailyReport() {
  const { role } = getUserInfo();
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  const toast = useToast();
  const [visitors, setVisitors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
    pending: 0
  });

  const loadDailyData = async () => {
    setLoading(true);
    try {
      const data = await visitorApi.getAll();
      const todayString = new Date().toDateString();
      const todayVisitors = data.filter(v => new Date(v.createdAt).toDateString() === todayString);

      const total = todayVisitors.length;
      const checkedIn = todayVisitors.filter(v => v.status === 'Checked In').length;
      const checkedOut = todayVisitors.filter(v => v.status === 'Checked Out').length;
      const pending = todayVisitors.filter(v => v.status === 'Pending').length;

      setStats({ total, checkedIn, checkedOut, pending });
      setVisitors(todayVisitors);
    } catch (err) {
      toast.error('Failed to load daily report details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Daily Report | GatePass Pro';
    loadDailyData();
  }, []);

  const handleExportCSV = () => {
    if (visitors.length === 0) {
      toast.warning('No visitor logs to export for today.');
      return;
    }
    const headers = ['Visitor Name', 'Mobile', 'Type', 'Purpose', 'Vehicle Number', 'Destination Flat', 'Passcode', 'Status', 'Checked In At', 'Checked Out At'];
    const rows = visitors.map(v => [
      v.name || '',
      v.mobile || '',
      v.type || '',
      v.purpose || '',
      v.vehicleNumber || '',
      v.flatNo || '',
      v.passcode || '',
      v.status || '',
      v.checkedInAt ? new Date(v.checkedInAt).toLocaleString() : '',
      v.checkedOutAt ? new Date(v.checkedOutAt).toLocaleString() : ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Daily report exported successfully!');
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.flatNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Daily Reports & Activity</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Society entries summary, gate analytics, and check-in stats for today.
          </p>
        </div>
        <FormButton onClick={handleExportCSV} variant="secondary">
          <Download size={16} style={{ marginRight: '6px' }} />
          <span>Export Daily CSV</span>
        </FormButton>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '24px' 
      }}>
        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '14px', borderRadius: '14px' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Visitors Today</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '14px', borderRadius: '14px' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Checked-In</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats.checkedIn}</div>
          </div>
        </div>

        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', backgroundColor: 'var(--border)', padding: '14px', borderRadius: '14px' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Checked-Out</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats.checkedOut}</div>
          </div>
        </div>

        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ color: 'var(--warning)', backgroundColor: 'var(--warning-light)', padding: '14px', borderRadius: '14px' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Pending Approvals</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats.pending}</div>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search today's logs by visitor name or flat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
            <Search className="input-icon" size={20} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <span>Loading today's activity log...</span>
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-light)' }}>
            No matching visitor activities recorded today.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visitor</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type / Purpose</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Flat</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle No</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Check-In Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor, idx) => (
                  <tr key={visitor._id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)' }}>
                    <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                      <div>{visitor.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{visitor.mobile}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{visitor.type}</div>
                      {visitor.purpose && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{visitor.purpose}</div>}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem', fontWeight: '600' }}>Flat {visitor.flatNo}</td>
                    <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{visitor.vehicleNumber || 'N/A'}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: 
                          visitor.status === 'Checked In' ? 'var(--success-light)' : 
                          visitor.status === 'Checked Out' ? 'var(--border)' : 
                          visitor.status === 'Approved' ? 'var(--primary-light)' : 
                          visitor.status === 'Rejected' ? 'var(--accent-light)' : 
                          'var(--warning-light)',
                        color: 
                          visitor.status === 'Checked In' ? 'var(--success)' : 
                          visitor.status === 'Checked Out' ? 'var(--text-muted)' : 
                          visitor.status === 'Approved' ? 'var(--primary)' : 
                          visitor.status === 'Rejected' ? 'var(--accent)' : 
                          'var(--warning)'
                      }}>
                        {visitor.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {visitor.checkedInAt ? new Date(visitor.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Check-In'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
