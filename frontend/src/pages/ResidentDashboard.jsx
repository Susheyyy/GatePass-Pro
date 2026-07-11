import { useState, useEffect } from 'react';
import {  
  XCircle, 
  Clock, 
  Building,  
  Users,
  AlertTriangle,
  MessageSquare,
  Send,
  X,
  Key
} from 'lucide-react';
import { residentApi, visitorApi, getUserInfo } from '../services/api';
import { FormButton, FormInput } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';
import { getSocket } from '../services/socket';

const ExpiryCountdown = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = (new Date(createdAt).getTime() + 24 * 60 * 60 * 1000) - Date.now();
      if (difference <= 0) {
        return 'Expired';
      }
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m left`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, [createdAt]);

  return (
    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold', marginTop: '4px' }}>
      {timeLeft}
    </div>
  );
};

export default function ResidentDashboard() {
  const toast = useToast();
  const [resident, setResident] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [selectedVisitorForPass, setSelectedVisitorForPass] = useState(null);
  const [isPassDetailOpen, setIsPassDetailOpen] = useState(false);
  const [flatMembers, setFlatMembers] = useState([]);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    mobile: '',
    gmail: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    type: 'Guest',
    mobile: '',
    purpose: '',
    vehicleNumber: ''
  });

  const { residentId, email: residentEmail } = getUserInfo();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [distressMessage, setDistressMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchResidentDetails = async () => {
    try {
      let matched = null;
      if (residentId) {
        matched = await residentApi.getById(residentId);
      } else {
        const list = await residentApi.getAll();
        matched = list.find(r => r.email.toLowerCase() === residentEmail?.toLowerCase());
      }
      if (matched) {
        setResident(matched);
        const membersList = await residentApi.getAll(matched.flatNo);
        setFlatMembers(membersList);
        if (matched.status === 'Approved') {
          const visitorList = await visitorApi.getAll({ flatNo: matched.flatNo });
          setVisitors(visitorList);
        }
      } else {
        setError('No active society record found for your email address.');
      }
    } catch (err) {
      setError('Failed to fetch details. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Dashboard | GatePass Pro';
    fetchResidentDetails();
  }, [residentId, residentEmail]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleVisitorChange = (updatedVisitor) => {
        setVisitors(prev => {
          const exists = prev.some(v => v._id === updatedVisitor._id);
          if (exists) {
            return prev.map(v => v._id === updatedVisitor._id ? updatedVisitor : v);
          } else {
            return [updatedVisitor, ...prev];
          }
        });
      };

      socket.on('visitor_check_status', handleVisitorChange);

      return () => {
        socket.off('visitor_check_status', handleVisitorChange);
      };
    }
  }, []);

  const handleUpdateStatus = async (newStatus) => {
    if (!resident) return;
    setUpdating(true);
    try {
      const updated = await residentApi.update(resident._id, {
        ...resident,
        status: newStatus
      });
      setResident(updated);
      if (newStatus === 'Approved') {
        const visitorList = await visitorApi.getAll({ flatNo: resident.flatNo });
        setVisitors(visitorList);
      }
    } catch (err) {
      toast.error('Failed to update verification status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    try {
      const newVisitor = await visitorApi.create({
        ...visitorForm,
        flatNo: resident.flatNo,
        status: 'Approved'
      });
      setVisitors(prev => [newVisitor, ...prev]);
      setIsPassModalOpen(false);
      setVisitorForm({ name: '', type: 'Guest', mobile: '', purpose: '', vehicleNumber: '' });
      toast.success('Pre-approved pass created successfully!');
    } catch (err) {
      toast.error('Failed to create pre-approved pass.');
    }
  };

  const handleApproveVisitor = async (visitorId) => {
    try {
      const updated = await visitorApi.update(visitorId, { status: 'Approved' });
      setVisitors(prev => prev.map(v => v._id === visitorId ? updated : v));
      toast.success('Visitor approved successfully!');
    } catch (err) {
      toast.error('Failed to approve visitor.');
    }
  };

  const handleViewPass = (visitor) => {
    setSelectedVisitorForPass(visitor);
    setIsPassDetailOpen(true);
  };

  const handleDownloadQr = async () => {
    if (!selectedVisitorForPass) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedVisitorForPass.passcode)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `pass-${selectedVisitorForPass.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('QR Code downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download QR Code. Please try again.');
    }
  };

  const handleRejectVisitor = async (visitorId) => {
    try {
      const updated = await visitorApi.update(visitorId, { status: 'Rejected' });
      setVisitors(prev => prev.map(v => v._id === visitorId ? updated : v));
      toast.success('Visitor rejected successfully!');
    } catch (err) {
      toast.error('Failed to reject visitor.');
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d+$/.test(memberForm.mobile.trim())) {
      toast.warning('Mobile Number must contain only digits');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i.test(memberForm.gmail.trim())) {
      toast.warning('Gmail Address must end with a standard provider');
      return;
    }
    try {
      await residentApi.create({
        ...memberForm,
        flatNo: resident.flatNo,
        members: 1,
        isResidentAdding: true
      });
      setIsMemberModalOpen(false);
      setMemberForm({ name: '', mobile: '', gmail: '' });
      toast.success('Co-resident added successfully!');
      fetchResidentDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to add co-resident.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }}></div>
        <span>Retrieving your profile record...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="content-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--warning)' }} />
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Profile Record Missing</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error || "Could not locate your profile details. Please request the administrator to add you."}</p>
        </div>
      </div>
    );
  }

  if (resident.status !== 'Approved') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Resident Profile Desk
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Welcome back, {resident.name}. View and verify your society registration status below.
          </p>
        </div>

        <div className="content-card" style={{ padding: '36px', position: 'relative' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '15px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '24px',
            marginBottom: '30px'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Registration Request From Manager
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                Flat Profile Verification
              </h3>
            </div>

            <div>
              {resident.status === 'Pending' ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--warning-light)',
                  color: 'var(--warning)',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}>
                  <Clock size={14} />
                  <span>Pending Verification</span>
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}>
                  <XCircle size={14} />
                  <span>Rejected</span>
                </span>
              )}
            </div>
          </div>

          {resident.status === 'Pending' ? (
            <div style={{
              backgroundColor: 'rgba(99, 102, 241, 0.04)',
              border: '1px dashed var(--primary-border)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '30px',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
             The society manager has registered your account for <strong>Flat {resident.flatNo}</strong>. Please check and confirm if the details below are correct to complete verification.
            </div>
          ) : (
            <div style={{
              backgroundColor: 'var(--accent-light)',
              border: '1px solid rgba(244, 63, 94, 0.15)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '30px',
              color: 'var(--accent)',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <XCircle size={20} />
              <span>You have rejected this profile. If this was a mistake, please notify the society management office.</span>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '36px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Flat No</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{resident.flatNo}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Full Name</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{resident.name}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Mobile</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{resident.mobile}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Email</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', wordBreak: 'break-all' }}>{resident.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Family Members</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{resident.members}</div>
              </div>
            </div>
          </div>

          {resident.status === 'Pending' && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '15px',
              borderTop: '1px solid var(--border)',
              paddingTop: '24px'
            }}>
              <FormButton 
                onClick={() => handleUpdateStatus('Rejected')} 
                variant="secondary"
                disabled={updating}
                style={{ padding: '12px 28px' }}
              >
                Reject Request
              </FormButton>
              <FormButton 
                onClick={() => handleUpdateStatus('Approved')} 
                variant="success"
                disabled={updating}
                style={{ padding: '12px 36px' }}
              >
                Approve Profile
              </FormButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeVisitorsCount = visitors.filter(v => v.status === 'Checked In').length;
  const preApprovedCount = visitors.filter(v => v.status === 'Approved').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Resident Control Desk
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Flat {resident.flatNo} &bull; Welcome back, {resident.name}.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <FormButton onClick={() => setIsMemberModalOpen(true)} variant="secondary">
            <span>Add Co-Resident</span>
          </FormButton>
          <FormButton onClick={() => setIsPassModalOpen(true)} variant="primary">
            <span>Pre-Approve Visitor</span>
          </FormButton>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '24px' 
      }}>
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
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Checked-In Guests</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{activeVisitorsCount}</div>
          </div>
        </div>

        <div className="content-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            color: 'var(--primary)', 
            backgroundColor: 'var(--primary-light)', 
            padding: '14px', 
            borderRadius: '14px' 
          }}>
            <Key size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Pre-Approved Passes</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{preApprovedCount}</div>
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
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Entries</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{visitors.length}</div>
          </div>
        </div>
      </div>

      <div className="content-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Flat Members / Co-Residents ({flatMembers.length})</span>
        </h3>
        {flatMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-light)' }}>
            No registered members found for this flat.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {flatMembers.map((member) => (
              <div 
                key={member._id} 
                style={{ 
                  padding: '16px', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  backgroundColor: 'var(--bg-card)' 
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: '700', 
                  fontSize: '1.1rem' 
                }}>
                  {member.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.name} {member._id === residentId && '(You)'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.gmail}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.mobile}</span>
                </div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  backgroundColor: member.status === 'Approved' ? 'var(--success-light)' : 'var(--warning-light)', 
                  color: member.status === 'Approved' ? 'var(--success)' : 'var(--warning)',
                  whiteSpace: 'nowrap'
                }}>
                  {member.status || 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="content-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px' }}>
          Visitor Entry Passes & Logs
        </h3>

        {visitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
            No visitor logs recorded yet. Create a pre-approved pass to invite guests.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Visitor Name</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Type</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'center' }}>Passcode</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'center' }}>Status</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'center' }}>Date</th>
                  <th style={{ paddingBottom: '12px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => (
                  <tr key={visitor._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 0', fontWeight: '700', color: 'var(--text-main)' }}>
                      <div>{visitor.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{visitor.mobile || 'No Mobile'}</div>
                    </td>
                    <td style={{ padding: '14px 0', fontWeight: '600', color: 'var(--primary)' }}>{visitor.type}</td>
                    <td style={{ padding: '14px 0', textAlign: 'center', fontWeight: '700', color: 'var(--accent)' }}>
                      <code>{visitor.passcode}</code>
                      {visitor.status === 'Approved' && (
                        <ExpiryCountdown createdAt={visitor.createdAt} />
                      )}
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        backgroundColor: 
                          visitor.isOverdue ? 'var(--accent-light)' :
                          visitor.status === 'Checked In' ? 'var(--success-light)' : 
                          visitor.status === 'Checked Out' ? 'var(--border)' : 
                          visitor.status === 'Approved' ? 'var(--primary-light)' : 
                          visitor.status === 'Rejected' ? 'var(--accent-light)' : 
                          'var(--warning-light)',
                        color: 
                          visitor.isOverdue ? 'var(--accent)' :
                          visitor.status === 'Checked In' ? 'var(--success)' : 
                          visitor.status === 'Checked Out' ? 'var(--text-muted)' : 
                          visitor.status === 'Approved' ? 'var(--primary)' : 
                          visitor.status === 'Rejected' ? 'var(--accent)' : 
                          'var(--warning)'
                      }}>
                        {visitor.isOverdue ? 'Overdue' : visitor.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(visitor.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'right' }}>
                      {visitor.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleApproveVisitor(visitor._id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--success-light)',
                              color: 'var(--success)',
                              fontWeight: '700',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectVisitor(visitor._id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'var(--accent-light)',
                              color: 'var(--accent)',
                              fontWeight: '700',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : visitor.status === 'Approved' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleViewPass(visitor)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--primary)',
                              backgroundColor: 'transparent',
                              color: 'var(--primary)',
                              fontWeight: '700',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            View Pass
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isPassModalOpen && (
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
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>Create Pre-Approved Pass</h3>
              <button onClick={() => setIsPassModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVisitorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              <FormInput
                label="Visitor Full Name"
                value={visitorForm.name}
                onChange={(e) => setVisitorForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter Full Name"
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>Visitor Type</label>
                <select
                  value={visitorForm.type}
                  onChange={(e) => setVisitorForm(prev => ({ ...prev, type: e.target.value }))}
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
                  <option value="Cab">Cab</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <FormInput
                label="Mobile Number"
                value={visitorForm.mobile}
                onChange={(e) => setVisitorForm(prev => ({ ...prev, mobile: e.target.value }))}
                placeholder="Enter phone number"
                required
              />

              <FormInput
                label="Purpose of Visit"
                value={visitorForm.purpose}
                onChange={(e) => setVisitorForm(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Enter purpose of visit"
                required
              />

              <FormInput
                label="Vehicle Number (Optional)"
                value={visitorForm.vehicleNumber}
                onChange={(e) => setVisitorForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                placeholder="Enter vehicle number"
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
                <FormButton onClick={() => setIsPassModalOpen(false)} variant="secondary" style={{ flex: 1 }}>
                  Cancel
                </FormButton>
                <FormButton type="submit" variant="primary" style={{ flex: 2 }}>
                  Generate Code
                </FormButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMemberModalOpen && (
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
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>Add Co-Resident</h3>
              <button onClick={() => setIsMemberModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              <FormInput
                label="Full Name"
                value={memberForm.name}
                onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                required
              />

              <FormInput
                label="Mobile Number"
                value={memberForm.mobile}
                onChange={(e) => setMemberForm(prev => ({ ...prev, mobile: e.target.value }))}
                placeholder="Enter phone number"
                required
              />

              <FormInput
                label="Gmail Address"
                value={memberForm.gmail}
                onChange={(e) => setMemberForm(prev => ({ ...prev, gmail: e.target.value }))}
                placeholder="Enter Gmail ID"
                required
              />

              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
                <FormButton onClick={() => setIsMemberModalOpen(false)} variant="secondary" style={{ flex: 1 }}>
                  Cancel
                </FormButton>
                <FormButton type="submit" variant="primary" style={{ flex: 2 }}>
                  Add Member
                </FormButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px'
      }}>
        {isChatOpen && (
          <div style={{
            width: '350px',
            height: '450px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--primary)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>
                  Contact Admin
                </span>
                {resident.distressStatus && resident.distressStatus !== 'None' && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    marginLeft: '8px',
                    backgroundColor: 
                      resident.distressStatus === 'Active' ? 'var(--accent)' :
                      resident.distressStatus === 'Resolved' ? 'var(--success)' :
                      'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}>
                    {resident.distressStatus}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'rgba(0,0,0,0.01)'
            }}>
              {(!resident.distressMessages || resident.distressMessages.length === 0) ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem'
                }}>
                  Need help? Send a distress message directly to the society administration desk.
                </div>
              ) : (
                resident.distressMessages.map((msg, index) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div
                      key={msg._id || index}
                      style={{
                        alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        backgroundColor: isAdmin ? 'rgba(0,0,0,0.03)' : 'var(--primary-light)',
                        border: isAdmin ? '1px solid var(--border)' : '1px solid var(--primary-border)',
                        borderRadius: isAdmin ? '12px 12px 12px 0' : '12px 12px 0 12px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', wordBreak: 'break-word', textAlign: 'left' }}>
                        {msg.message}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!distressMessage.trim() || sendingMessage) return;
                setSendingMessage(true);
                try {
                  const updated = await residentApi.update(resident._id, {
                    distressMessage: distressMessage.trim()
                  });
                  setResident(updated);
                  setDistressMessage('');
                  toast.success('Message sent to gate controls!');
                } catch (err) {
                  toast.error('Failed to send message. Please try again.');
                } finally {
                  setSendingMessage(false);
                }
              }}
              style={{
                padding: '12px',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                gap: '8px'
              }}
            >
              <input
                type="text"
                value={distressMessage}
                onChange={(e) => setDistressMessage(e.target.value)}
                placeholder="Type distress message..."
                disabled={sendingMessage}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              <button
                type="submit"
                disabled={!distressMessage.trim() || sendingMessage}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: distressMessage.trim() ? 1 : 0.6,
                  transition: 'var(--transition)'
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(244, 63, 94, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition)'
          }}
        >
          <MessageSquare size={24} />
        </button>
      </div>

      {isPassDetailOpen && selectedVisitorForPass && (
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
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '440px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-premium)',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Visitor Entry Pass</h3>
              <button onClick={() => { setIsPassDetailOpen(false); setSelectedVisitorForPass(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              width: '100%',
              padding: '24px',
              borderRadius: '16px',
              border: '2px dashed var(--primary-border)',
              backgroundColor: 'rgba(99, 102, 241, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedVisitorForPass.passcode)}`}
                alt="Visitor Pass QR Code"
                style={{ width: '150px', height: '150px', borderRadius: '8px', border: '1px solid var(--border)' }}
              />
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitor Name</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{selectedVisitorForPass.name}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', gap: '12px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passcode</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent)' }}>{selectedVisitorForPass.passcode}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flat No</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>{selectedVisitorForPass.flatNo}</div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <FormButton onClick={handleDownloadQr} variant="secondary" style={{ flex: 1 }}>
                Download QR
              </FormButton>
              <FormButton onClick={() => { setIsPassDetailOpen(false); setSelectedVisitorForPass(null); }} variant="primary" style={{ flex: 1 }}>
                Close Pass
              </FormButton>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
        }
      `}</style>
    </div>
  );
}
