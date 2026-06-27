import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Users,
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Info,
  Building,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { residentApi } from '../services/api';
import { FormInput, FormButton } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

export default function Residents() {
  const userRole = localStorage.getItem('gatepass_role') || 'admin';
  if (userRole === 'security') {
    return <Navigate to="/visitors" replace />;
  }
  const toast = useToast();
  const [residents, setResidents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDistressResident, setSelectedDistressResident] = useState(null);
  const [isDistressOpen, setIsDistressOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add'); 
  const [selectedResidentId, setSelectedResidentId] = useState(null);
  
  const [formData, setFormData] = useState({
    flatNo: '',
    name: '',
    mobile: '',
    gmail: '',
    members: 1
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState(null);

  const [notification, setNotification] = useState('');

  const fetchResidents = async (query = '') => {
    setLoading(true);
    try {
      const data = await residentApi.getAll(query);
      setResidents(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch residents data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchResidents(val);
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleOpenAdd = () => {
    setFormData({
      flatNo: '',
      name: '',
      mobile: '',
      gmail: '',
      members: 1
    });
    setFormMode('add');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (resident) => {
    setFormData({
      flatNo: resident.flatNo,
      name: resident.name,
      mobile: resident.mobile,
      gmail: resident.gmail || '',
      members: resident.members
    });
    setSelectedResidentId(resident._id);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^[a-zA-Z]+-\d+$/.test(formData.flatNo.trim())) {
      toast.warning('Flat Number must be in Alphabet-number format (e.g. A-102, B-405)');
      return;
    }
    
    if (!/^\d+$/.test(formData.mobile.trim())) {
      toast.warning('Mobile Number must contain only digits');
      return;
    }
    
    if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i.test(formData.gmail.trim())) {
      toast.warning('Gmail Address must end with a standard provider (e.g. @gmail.com, @yahoo.com)');
      return;
    }
    
    if (!/^\d+$/.test(formData.members.toString().trim())) {
      toast.warning('Total Family Members must contain only digits');
      return;
    }

    try {
      const submitData = {
        ...formData,
        members: parseInt(formData.members) || 1
      };
      if (formMode === 'add') {
        await residentApi.create(submitData);
        showNotification('New resident added successfully!');
      } else {
        await residentApi.update(selectedResidentId, submitData);
        showNotification('Resident details updated successfully!');
      }
      setIsFormOpen(false);
      fetchResidents(searchQuery);
    } catch (err) {
      setError(err.message || 'Operation failed. Please try again.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await residentApi.update(id, { status: newStatus });
      toast.success(`Resident status updated to ${newStatus}!`);
      fetchResidents(searchQuery);
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      try {
        const lines = text.split('\n');
        if (lines.length < 2) {
          toast.warning('CSV file is empty or missing headers.');
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/['"]+/g, '').toLowerCase());
        const residents = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim().replace(/['"]+/g, ''));
          const residentObj = {};
          headers.forEach((header, index) => {
            residentObj[header] = values[index];
          });
          
          residentObj.members = parseInt(residentObj.members) || 1;
          residents.push(residentObj);
        }
        
        if (residents.length === 0) {
          toast.warning('No residents found in the CSV file.');
          return;
        }
        
        const res = await residentApi.bulkCreate(residents);
        toast.success(res.message || `Successfully imported ${residents.length} residents!`);
        fetchResidents(searchQuery);
      } catch (err) {
        toast.error(err.message || 'Failed to import CSV file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const triggerDelete = (resident) => {
    setResidentToDelete(resident);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!residentToDelete) return;
    try {
      await residentApi.delete(residentToDelete._id);
      showNotification(`Resident ${residentToDelete.name} has been deleted.`);
      setIsDeleteOpen(false);
      setResidentToDelete(null);
      fetchResidents(searchQuery);
    } catch (err) {
      setError('Could not delete resident. Please try again.');
    }
  };

  const handleResendOtp = async (resident) => {
    try {
      await residentApi.resendOtp(resident._id);
      showNotification(`New verification OTP sent to ${resident.name}'s Gmail address.`);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    }
  };

  const totalResidents = residents.length;
  const totalMembers = residents.reduce((acc, curr) => acc + (parseInt(curr.members) || 0), 0);
  const occupiedUnits = new Set(residents.map(r => r.flatNo)).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Resident Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Maintain database records, apartment occupation, and resident family members.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="file" 
            id="csv-file-input" 
            accept=".csv" 
            onChange={handleCsvImport} 
            style={{ display: 'none' }} 
          />
          <FormButton onClick={() => document.getElementById('csv-file-input').click()} variant="secondary">
            <span>Import CSV</span>
          </FormButton>
          <FormButton onClick={handleOpenAdd} variant="primary">
            <span>Add Resident</span>
          </FormButton>
        </div>
      </div>

      {notification && (
        <div style={{
          backgroundColor: 'var(--success-light)',
          color: 'var(--success)',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '0.95rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <Check size={18} style={{ strokeWidth: 3 }} />
          <span>{notification}</span>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '24px' 
      }}>
        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            color: 'var(--primary)', 
            backgroundColor: 'var(--primary-light)', 
            padding: '14px', 
            borderRadius: '14px' 
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Profiles</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{totalResidents}</div>
          </div>
        </div>

        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            color: 'var(--success)', 
            backgroundColor: 'var(--success-light)', 
            padding: '14px', 
            borderRadius: '14px' 
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Members</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{totalMembers}</div>
          </div>
        </div>

        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            color: '#e28743', 
            backgroundColor: 'rgba(226, 135, 67, 0.08)', 
            padding: '14px', 
            borderRadius: '14px' 
          }}>
            <Building size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Occupied Flats</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{occupiedUnits}</div>
          </div>
        </div>
      </div>

      <div className="content-card">

        <div style={{ marginBottom: '24px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by Flat Number or Resident Name..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="input-field"
            />
            <Search className="input-icon" size={20} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px auto'
            }}></div>
            <span>Loading residents...</span>
          </div>
        ) : error ? (
          <div style={{ 
            padding: '24px', 
            backgroundColor: 'var(--accent-light)', 
            color: 'var(--accent)', 
            borderRadius: '12px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {error}
          </div>
        ) : residents.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '50px 0', 
            color: 'var(--text-light)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Info size={40} />
            <div>
              <h4 style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.05rem' }}>No Residents Found</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {searchQuery ? 'Try matching different search keywords.' : 'Add your first resident using the button above.'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-bootstrap" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flat No</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resident Name</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Login Username</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Members</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((resident, idx) => (
                  <tr 
                    key={resident._id} 
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.5)',
                      transition: 'var(--transition)'
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '16px', fontWeight: '700', color: 'var(--primary)' }}>
                      {resident.flatNo}
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span>{resident.name}</span>
                        {resident.distressMessages && resident.distressMessages.length > 0 && resident.distressStatus === 'Active' && (
                          <span 
                            onClick={() => { setSelectedDistressResident(resident); setIsDistressOpen(true); }}
                            title="Distress Messages Alert"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginLeft: '12px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: 'var(--accent-light)',
                              color: 'var(--accent)',
                              fontWeight: 'bold',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              border: '1px solid rgba(244, 63, 94, 0.2)'
                            }}
                          >
                            <AlertTriangle size={10} />
                            <span>{resident.distressMessages.length} Alert(s)</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {resident.mobile}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {resident.email}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '700', color: 'var(--text-main)' }}>
                      {resident.members}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: 
                          resident.status === 'Approved' ? 'var(--success-light)' : 
                          resident.status === 'Rejected' ? 'var(--accent-light)' : 
                          'var(--warning-light)',
                        color: 
                          resident.status === 'Approved' ? 'var(--success)' : 
                          resident.status === 'Rejected' ? 'var(--accent)' : 
                          'var(--warning)'
                      }}>
                        {resident.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {resident.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => handleStatusChange(resident._id, 'Approved')}
                              title="Approve Resident"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--success)',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--success-light)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => handleStatusChange(resident._id, 'Rejected')}
                              title="Reject Resident"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--accent)',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-light)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {resident.status !== 'Approved' && (
                          <button 
                            onClick={() => handleResendOtp(resident)}
                            title="Resend OTP Email"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              transition: 'var(--transition)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--success)'; e.currentTarget.style.backgroundColor = 'var(--success-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(resident)}
                          title="Edit Resident"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            transition: 'var(--transition)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-light)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => triggerDelete(resident)}
                          title="Delete Resident"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            transition: 'var(--transition)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--accent-light)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
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

      {isFormOpen && (
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
            maxWidth: '540px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-premium)',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            maxHeight: '90vh'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {formMode === 'add' ? 'Add Society Resident' : 'Edit Resident Profile'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--border)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              <FormInput
                label="Flat Number"
                name="flatNo"
                placeholder="Enter flat number"
                value={formData.flatNo}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Resident Full Name"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Mobile Number"
                name="mobile"
                placeholder="Enter mobile number"
                value={formData.mobile}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Gmail Address"
                name="gmail"
                type="email"
                placeholder="Enter Gmail ID"
                value={formData.gmail}
                onChange={handleInputChange}
                required
              />

              <FormInput
                label="Total Family Members"
                name="members"
                type="text"
                placeholder="Enter number of members"
                value={formData.members}
                onChange={handleInputChange}
                required
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
                <FormButton 
                  onClick={() => setIsFormOpen(false)} 
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </FormButton>
                <FormButton 
                  type="submit" 
                  variant="primary"
                  style={{ flex: 2 }}
                >
                  {formMode === 'add' ? 'Register Resident' : 'Save Changes'}
                </FormButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '420px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-premium)',
            padding: '30px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <Trash2 size={28} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                Remove Resident?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{residentToDelete?.name}</strong> (Flat {residentToDelete?.flatNo})? This action is permanent and cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <FormButton 
                onClick={() => { setIsDeleteOpen(false); setResidentToDelete(null); }} 
                variant="secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </FormButton>
              <FormButton 
                onClick={confirmDelete} 
                variant="danger"
                style={{ flex: 1 }}
              >
                Delete Profile
              </FormButton>
            </div>
          </div>
        </div>
      )}

      {isDistressOpen && selectedDistressResident && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-premium)',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    Distress Alerts: {selectedDistressResident.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alert Status:</span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 
                        (selectedDistressResident.distressStatus === 'Active' || !selectedDistressResident.distressStatus || selectedDistressResident.distressStatus === 'None') ? 'var(--accent-light)' :
                        selectedDistressResident.distressStatus === 'Resolved' ? 'var(--success-light)' :
                        selectedDistressResident.distressStatus === 'Dismissed' ? 'rgba(100, 116, 139, 0.1)' : 'var(--accent-light)',
                      color:
                        (selectedDistressResident.distressStatus === 'Active' || !selectedDistressResident.distressStatus || selectedDistressResident.distressStatus === 'None') ? 'var(--accent)' :
                        selectedDistressResident.distressStatus === 'Resolved' ? 'var(--success)' :
                        selectedDistressResident.distressStatus === 'Dismissed' ? 'rgb(100, 116, 139)' : 'var(--accent)',
                    }}>
                      {(selectedDistressResident.distressStatus === 'None' || !selectedDistressResident.distressStatus) ? 'Active' : selectedDistressResident.distressStatus}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setIsDistressOpen(false); setSelectedDistressResident(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '8px'
            }}>
              {selectedDistressResident.distressMessages.map((msg, index) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div
                    key={msg._id || index}
                    style={{
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                      width: '85%',
                      backgroundColor: isAdmin ? 'var(--primary-light)' : 'rgba(244, 63, 94, 0.05)',
                      border: isAdmin ? '1px solid var(--primary-border)' : '1px solid rgba(244, 63, 94, 0.15)',
                      borderRadius: isAdmin ? '12px 12px 0 12px' : '12px 12px 12px 0',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500', textAlign: 'left' }}>
                      {msg.message}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!replyText.trim() || sendingReply) return;
                setSendingReply(true);
                try {
                  const updated = await residentApi.update(selectedDistressResident._id, {
                    distressMessage: replyText.trim(),
                    sender: 'admin'
                  });
                  setResidents(prev => prev.map(r => r._id === selectedDistressResident._id ? updated : r));
                  setSelectedDistressResident(updated);
                  setReplyText('');
                  toast.success('Reply sent successfully!');
                } catch (err) {
                  toast.error('Failed to send reply.');
                } finally {
                  setSendingReply(false);
                }
              }}
              style={{
                display: 'flex',
                gap: '8px',
                borderTop: '1px solid var(--border)',
                paddingTop: '16px'
              }}
            >
              <input
                type="text"
                placeholder="Type reply message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
              <FormButton type="submit" variant="primary" disabled={!replyText.trim() || sendingReply} style={{ padding: '10px 20px' }}>
                Reply
              </FormButton>
            </form>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <FormButton
                onClick={async () => {
                  try {
                    const updated = await residentApi.update(selectedDistressResident._id, { distressStatus: 'Resolved' });
                    setResidents(prev => prev.map(r => r._id === selectedDistressResident._id ? updated : r));
                    setSelectedDistressResident(updated);
                    toast.success('Distress alert status set to Resolved.');
                  } catch (err) {
                    toast.error('Failed to resolve alert.');
                  }
                }}
                variant="success"
              >
                Resolve
              </FormButton>
              
              <FormButton
                onClick={async () => {
                  try {
                    const updated = await residentApi.update(selectedDistressResident._id, { distressStatus: 'Dismissed' });
                    setResidents(prev => prev.map(r => r._id === selectedDistressResident._id ? updated : r));
                    setSelectedDistressResident(updated);
                    toast.success('Distress alert status set to Dismissed.');
                  } catch (err) {
                    toast.error('Failed to dismiss alert.');
                  }
                }}
                variant="secondary"
              >
                Dismiss
              </FormButton>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          background-color: var(--primary-light) !important;
          transform: translateX(4px);
        }
        .table-row-hover:hover td,
        .table-row-hover:hover td * {
          color: #0f172a !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
