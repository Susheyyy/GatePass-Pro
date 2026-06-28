import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Trash2, 
  Home, 
  User, 
  Phone, 
  MapPin, 
  Check, 
  LogOut, 
  LogIn,
  X 
} from 'lucide-react';
import { visitorApi } from '../services/api';
import { getSocket } from '../services/socket';
import { FormInput, FormButton } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

export default function Visitors() {
  const toast = useToast();
  const [visitors, setVisitors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Guest',
    mobile: '',
    flatNo: '',
    purpose: '',
    vehicleNumber: '',
    status: 'Pending'
  });
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [userRole] = useState(() => localStorage.getItem('gatepass_role') || 'admin');
  const [verifyFlatNo, setVerifyFlatNo] = useState('');
  const [verifyPasscode, setVerifyPasscode] = useState('');
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  const fetchVisitors = async (query = '') => {
    setLoading(true);
    try {
      const data = await visitorApi.getAll({ search: query });
      setVisitors(data);
    } catch (err) {
      setError('Failed to fetch visitors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleVisitorApprovalChange = (updatedVisitor) => {
        setVisitors(prev => {
          const exists = prev.some(v => v._id === updatedVisitor._id);
          if (exists) {
            return prev.map(v => v._id === updatedVisitor._id ? updatedVisitor : v);
          } else {
            return [updatedVisitor, ...prev];
          }
        });
      };

      socket.on('visitor_approval_changed', handleVisitorApprovalChange);

      return () => {
        socket.off('visitor_approval_changed', handleVisitorApprovalChange);
      };
    }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchVisitors(val);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await visitorApi.create(formData);
      setIsAddOpen(false);
      setFormData({
        name: '',
        type: 'Guest',
        mobile: '',
        flatNo: '',
        purpose: '',
        vehicleNumber: '',
        status: 'Pending'
      });
      fetchVisitors(searchQuery);
      toast.success('Visitor registered successfully!');
    } catch (err) {
      toast.error('Failed to register visitor.');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await visitorApi.update(id, { status: newStatus });
      fetchVisitors(searchQuery);
      toast.success('Visitor status updated!');
    } catch (err) {
      toast.error('Failed to update visitor status.');
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyFlatNo.trim() || !verifyPasscode.trim()) return;
    setVerifyingPasscode(true);
    try {
      await visitorApi.verifyPasscode({
        flatNo: verifyFlatNo.trim(),
        passcode: verifyPasscode.trim()
      });
      toast.success('Passcode verified! Visitor checked in successfully.');
      setVerifyFlatNo('');
      setVerifyPasscode('');
      fetchVisitors(searchQuery);
    } catch (err) {
      toast.error(err.message || 'Verification failed.');
    } finally {
      setVerifyingPasscode(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await visitorApi.delete(id);
      fetchVisitors(searchQuery);
      toast.success('Visitor log removed.');
    } catch (err) {
      toast.error('Failed to remove visitor.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleExportCSV = () => {
    if (visitors.length === 0) {
      toast.warning('No visitor logs to export.');
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
    link.setAttribute("download", `visitor_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Visitor logs exported to CSV.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Visitor Management 
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage current check-ins, approve visitor passcodes, and track society entry logs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {userRole === 'admin' && (
            <FormButton onClick={handleExportCSV} variant="secondary">
              <span>Export to CSV</span>
            </FormButton>
          )}
          <FormButton onClick={() => setIsAddOpen(true)} variant="primary">
            <span>New Entry Pass</span>
          </FormButton>
        </div>
      </div>

      {['admin', 'security'].includes(userRole) && (
        <div className="content-card" style={{ padding: '24px', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(50, 11, 53, 0.02) 100%)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
            Gate Pass Verification
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Verify 6-digit visitor passcode and check them in instantly.
          </p>
          <form onSubmit={handleVerifySubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <FormInput
                label="Destination Flat No"
                value={verifyFlatNo}
                onChange={(e) => setVerifyFlatNo(e.target.value)}
                placeholder="e.g. A-101"
                required
                style={{ margin: 0 }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <FormInput
                label="6-Digit Passcode"
                value={verifyPasscode}
                onChange={(e) => setVerifyPasscode(e.target.value)}
                placeholder="e.g. 123456"
                required
                maxLength={6}
                style={{ margin: 0 }}
              />
            </div>
            <FormButton type="submit" variant="primary" disabled={verifyingPasscode} style={{ height: '42px' }}>
              <span>{verifyingPasscode ? 'Verifying...' : 'Verify & Check In'}</span>
            </FormButton>
          </form>
        </div>
      )}

      <div className="content-card">
        <div style={{ marginBottom: '24px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by Visitor Name or Type..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="input-field"
            />
            <Search className="input-icon" size={20} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <span>Loading visitor records...</span>
          </div>
        ) : visitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-light)' }}>
            No visitor entries found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visitor Info</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type / Purpose</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle Number</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Destination</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Passcode</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor, idx) => (
                  <tr 
                    key={visitor._id} 
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      setSelectedVisitor(visitor);
                    }}
                    style={{ 
                      borderBottom: '1px solid var(--border)', 
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                      <div>{visitor.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{visitor.mobile || 'No Mobile'}</div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--primary)' }}>{visitor.type}</div>
                      {visitor.purpose && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{visitor.purpose}</div>}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>
                      {visitor.vehicleNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Flat {visitor.flatNo}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '1rem', color: 'var(--accent)' }}>
                      <code>{visitor.passcode}</code>
                    </td>
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
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>

                        {visitor.status === 'Approved' && (
                          <button
                            onClick={() => handleStatusUpdate(visitor._id, 'Checked In')}
                            title="Check In"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', padding: '6px' }}
                          >
                            <LogIn size={16} />
                          </button>
                        )}
                        {visitor.status === 'Checked In' && (
                          <button
                            onClick={() => handleStatusUpdate(visitor._id, 'Checked Out')}
                            title="Check Out"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '6px' }}
                          >
                            <LogOut size={16} />
                          </button>
                        )}
                        {userRole !== 'security' && visitor.status !== 'Approved' && visitor.status !== 'Checked In' && visitor.status !== 'Checked Out' && (
                          <button
                            onClick={() => setDeleteConfirmId(visitor._id)}
                            title="Delete Record"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-premium)',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            maxHeight: '90vh',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>Check-in Details</h3>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              <FormInput
                label="Visitor Full Name"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>Visitor Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    backgroundColor: 'var(--bg-card)'
                  }}
                >
                  <option value="Guest">Guest</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Cab">Cab</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <FormInput
                label="Mobile Number"
                name="mobile"
                placeholder="Enter mobile number"
                value={formData.mobile}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Destination Flat No"
                name="flatNo"
                placeholder="Enter flat number"
                value={formData.flatNo}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Purpose of Visit"
                name="purpose"
                placeholder="Enter purpose of visit"
                value={formData.purpose}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Vehicle Number"
                name="vehicleNumber"
                placeholder="Enter vehicle number"
                value={formData.vehicleNumber}
                onChange={handleInputChange}
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
                <FormButton onClick={() => setIsAddOpen(false)} variant="secondary" style={{ flex: 1 }}>
                  Cancel
                </FormButton>
                <FormButton type="submit" variant="primary" style={{ flex: 2 }}>
                  Create Pass
                </FormButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVisitor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '30px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                Visitor Details
              </h3>
              <button 
                onClick={() => setSelectedVisitor(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Name</span>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedVisitor.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Mobile</span>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedVisitor.mobile || 'No Mobile'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Purpose</span>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedVisitor.purpose || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Vehicle Number</span>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedVisitor.vehicleNumber || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Visitor Type</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{selectedVisitor.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Destination</span>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>Flat {selectedVisitor.flatNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Passcode</span>
                <span style={{ fontWeight: '700', color: 'var(--accent)', fontFamily: 'monospace', fontSize: '1.1rem' }}>{selectedVisitor.passcode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</span>
                <span style={{
                  display: 'inline-flex',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  backgroundColor: 
                    selectedVisitor.status === 'Checked In' ? 'var(--success-light)' : 
                    selectedVisitor.status === 'Checked Out' ? 'var(--border)' : 
                    'var(--warning-light)',
                  color: 
                    selectedVisitor.status === 'Checked In' ? 'var(--success)' : 
                    selectedVisitor.status === 'Checked Out' ? 'var(--text-muted)' : 
                    'var(--warning)'
                }}>{selectedVisitor.status}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>Timeline Logs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Pre-approved:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                      {new Date(selectedVisitor.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Checked In:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                      {selectedVisitor.checkedInAt ? new Date(selectedVisitor.checkedInAt).toLocaleString() : 'Not Checked In'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Checked Out:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>
                      {selectedVisitor.checkedOutAt ? new Date(selectedVisitor.checkedOutAt).toLocaleString() : 'Not Checked Out'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <FormButton onClick={() => setSelectedVisitor(null)} variant="secondary">
                Close
              </FormButton>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '400px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-premium)',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Are you sure you want to remove this visitor log? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <FormButton onClick={() => setDeleteConfirmId(null)} variant="secondary" style={{ flex: 1 }}>
                Cancel
              </FormButton>
              <FormButton onClick={() => handleDelete(deleteConfirmId)} variant="primary" style={{ flex: 1, backgroundColor: 'var(--accent)' }}>
                Delete
              </FormButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
