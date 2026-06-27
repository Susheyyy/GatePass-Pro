import { useState, useEffect } from 'react';
import { User, Phone, MapPin, Building, Shield, FileText, KeyRound, Save, Mail } from 'lucide-react';
import { residentApi } from '../services/api';
import { FormInput, FormButton } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    location: '',
    address: '',
    mobile: '',
    gmail: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.warning('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters long.');
      return;
    }
    setChangingPassword(true);
    try {
      if (userRole === 'admin') {
        const currentAdminPass = localStorage.getItem('gatepass_admin_password') || 'admin123';
        if (passwordData.currentPassword !== currentAdminPass) {
          toast.error('Incorrect current password.');
          setChangingPassword(false);
          return;
        }
        localStorage.setItem('gatepass_admin_password', passwordData.newPassword);
        toast.success('Admin password updated successfully!');
      } else {
        await residentApi.update(profile._id, {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });
        toast.success('Password updated successfully!');
      }
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const userRole = localStorage.getItem('gatepass_role') || 'admin';
  const residentId = localStorage.getItem('gatepass_resident_id');
  const residentEmail = localStorage.getItem('gatepass_resident_email');

  const fetchProfile = async () => {
    if (userRole === 'admin') {
      setProfile({
        name: 'System Administrator',
        email: 'admin@gatepass.com',
        role: 'Admin',
        mobile: 'N/A',
        communityId: 'ADMIN',
        bio: 'Main system administrator for GatePass Pro security controls.',
        location: 'Central Security Tower',
        address: 'Gate Control Room'
      });
      setFormData({
        bio: 'Main system administrator for GatePass Pro security controls.',
        location: 'Central Security Tower',
        address: 'Gate Control Room',
        mobile: 'N/A',
        gmail: 'admin@gatepass.com'
      });
      setLoading(false);
    } else {
      try {
        const list = await residentApi.getAll();
        const matched = list.find(r => r._id === residentId || r.email.toLowerCase() === residentEmail?.toLowerCase());
        if (matched) {
          if (!matched.communityId) {
            matched.communityId = Math.floor(10000 + Math.random() * 90000).toString();
          }
          setProfile(matched);
          setFormData({
            location: matched.location || 'GatePass Residency',
            address: matched.address || `Flat ${matched.flatNo}, GatePass Residency`,
            mobile: matched.mobile || '',
            gmail: matched.gmail || ''
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [residentId, residentEmail, userRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'admin') return;
    setUpdating(true);
    try {
      const updated = await residentApi.update(profile._id, {
        ...formData
      });
      setProfile(updated);
      toast.success('Profile details updated successfully!');
    } catch (err) {
      toast.error('Failed to save profile details.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
        <span>Loading profile details...</span>
      </div>
    );
  }

  const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
          My Account Profile
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Manage your personal bio, contact info, and residency credentials.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px'
      }}>
        
        <div className="content-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: '800',
            boxShadow: '0 8px 24px rgba(50, 11, 53, 0.15)'
          }}>
            {initials}
          </div>

          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)' }}>{profile.name}</h3>
          </div>

          {userRole !== 'admin' && formData.bio && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
              "{formData.bio}"
            </p>
          )}

          <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Community ID</span>
              <span style={{ fontWeight: '700', color: 'var(--accent)' }}>GP-{profile.communityId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Gmail ID</span>
              <span style={{ fontWeight: '600' }}>{profile.gmail || profile.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sign-in User</span>
              <span style={{ fontWeight: '600' }}>{profile.email}</span>
            </div>
          </div>
        </div>

        <div className="content-card" style={{ padding: '36px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '24px' }}>
            Profile Configuration Details
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>Community Role</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={userRole === 'admin' ? 'Community Administrator' : 'Resident'}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    color: 'var(--text-muted)',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
                <User size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
              </div>
            </div>

            <FormInput
              label="Bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              icon={FileText}
              placeholder="e.g. Software engineer, Tower A"
              disabled={userRole === 'admin'}
            />

            <FormInput
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              icon={MapPin}
              placeholder="e.g. Tower B, GatePass residency"
              disabled={userRole === 'admin'}
            />

            <FormInput
              label="Residency Address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              icon={Building}
              placeholder="e.g. Flat A-202"
              disabled={userRole === 'admin'}
            />

            <FormInput
              label="Gmail ID"
              value={formData.gmail}
              onChange={(e) => setFormData(prev => ({ ...prev, gmail: e.target.value }))}
              icon={Mail}
              placeholder="e.g. rajesh@gmail.com"
              disabled={true}
            />

            <FormInput
              label="Phone Number"
              value={formData.mobile}
              onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
              icon={Phone}
              placeholder="e.g. 9876543210"
              disabled={true}
            />

            {userRole !== 'admin' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <FormButton type="submit" variant="primary" disabled={updating} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Save size={16} />
                  <span>{updating ? 'Saving...' : 'Save Profile Changes'}</span>
                </FormButton>
              </div>
            )}
          </form>
        </div>

        <div className="content-card" style={{ padding: '36px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <KeyRound size={20} style={{ color: 'var(--primary)' }} />
            <span>Update Account Password</span>
          </h3>

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FormInput
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              icon={KeyRound}
              placeholder="••••••••"
              required
            />

            <FormInput
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              icon={KeyRound}
              placeholder="••••••••"
              required
            />

            <FormInput
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmNewPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
              icon={KeyRound}
              placeholder="••••••••"
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <FormButton type="submit" variant="primary" disabled={changingPassword} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Save size={16} />
                <span>{changingPassword ? 'Updating...' : 'Change Password'}</span>
              </FormButton>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
