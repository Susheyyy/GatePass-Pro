import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building, 
  User, 
  Phone, 
  Mail, 
  Users,
  AlertTriangle
} from 'lucide-react';
import { residentApi } from '../services/api';
import { FormButton } from '../components/FormComponents';

export default function ResidentDashboard() {
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const residentId = localStorage.getItem('gatepass_resident_id');
  const residentEmail = localStorage.getItem('gatepass_resident_email');

  const fetchResidentDetails = async () => {
    setLoading(true);
    try {
      const list = await residentApi.getAll();
      const matched = list.find(r => r._id === residentId || r.email.toLowerCase() === residentEmail?.toLowerCase());
      if (matched) {
        setResident(matched);
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
    fetchResidentDetails();
  }, [residentId, residentEmail]);

  const handleUpdateStatus = async (newStatus) => {
    if (!resident) return;
    setUpdating(true);
    try {
      const updated = await residentApi.update(resident._id, {
        ...resident,
        status: newStatus
      });
      setResident(updated);
    } catch (err) {
      alert('Failed to update verification status. Please try again.');
    } finally {
      setUpdating(false);
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
            {resident.status === 'Pending' && (
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
            )}
            {resident.status === 'Approved' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'var(--success-light)',
                color: 'var(--success)',
                fontWeight: '700',
                fontSize: '0.85rem'
              }}>
                <CheckCircle size={14} />
                <span>Verified & Approved</span>
              </span>
            )}
            {resident.status === 'Rejected' && (
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

        {resident.status === 'Pending' && (
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
            👋 The society manager has registered your account for <strong>Flat {resident.flatNo}</strong>. Please check and confirm if the details below are correct to complete verification.
          </div>
        )}

        {resident.status === 'Approved' && (
          <div style={{
            backgroundColor: 'var(--success-light)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '30px',
            color: 'var(--success)',
            fontWeight: '600',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <ShieldCheck size={20} />
            <span>Success! Your resident profile is active and verified by security control.</span>
          </div>
        )}

        {resident.status === 'Rejected' && (
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
              <Building size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Flat No</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{resident.flatNo}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Full Name</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{resident.name}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              <Phone size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Mobile</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{resident.mobile}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Email</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', wordBreak: 'break-all' }}>{resident.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', color: 'var(--text-muted)' }}>
              <Users size={20} />
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

        {resident.status !== 'Pending' && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--border)',
            paddingTop: '24px'
          }}>
            <FormButton 
              onClick={() => handleUpdateStatus('Pending')} 
              variant="secondary"
              disabled={updating}
            >
              Reset to Pending
            </FormButton>
          </div>
        )}

      </div>

    </div>
  );
}
