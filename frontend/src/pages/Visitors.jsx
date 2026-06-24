import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Trash2, 
  Home, 
  User, 
  Phone, 
  Clock, 
  MapPin, 
  Check, 
  LogOut, 
  LogIn 
} from 'lucide-react';
import { visitorApi } from '../services/api';
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
    status: 'Approved'
  });

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
        status: 'Approved'
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this visitor log?')) return;
    try {
      await visitorApi.delete(id);
      fetchVisitors(searchQuery);
      toast.success('Visitor log removed.');
    } catch (err) {
      toast.error('Failed to remove visitor.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Gate Entry & Visitor Desk
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage current check-ins, approve visitor passcodes, and track society entry logs.
          </p>
        </div>
        <FormButton onClick={() => setIsAddOpen(true)} variant="primary">
          <Plus size={18} />
          <span>New Entry Pass</span>
        </FormButton>
      </div>

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
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Destination</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Passcode</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor, idx) => (
                  <tr key={visitor._id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)' }}>
                    <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                      <div>{visitor.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{visitor.mobile || 'No Mobile'}</div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600', color: 'var(--primary)' }}>{visitor.type}</td>
                    <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
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
                          'var(--warning-light)',
                        color: 
                          visitor.status === 'Checked In' ? 'var(--success)' : 
                          visitor.status === 'Checked Out' ? 'var(--text-muted)' : 
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
                        <button
                          onClick={() => handleDelete(visitor._id)}
                          title="Delete Record"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px' }}
                        >
                          <Trash2 size={16} />
                        </button>
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
          justifyContent: 'flex-end',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'var(--bg-card)',
            height: '100%',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>Register Walk-in Entry</h3>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <FormInput
                label="Visitor Full Name"
                name="name"
                placeholder="e.g. Amit Kumar"
                value={formData.name}
                onChange={handleInputChange}
                icon={User}
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
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={handleInputChange}
                icon={Phone}
              />

              <FormInput
                label="Destination Flat No"
                name="flatNo"
                placeholder="e.g. A-202"
                value={formData.flatNo}
                onChange={handleInputChange}
                icon={Home}
                required
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
    </div>
  );
}
