import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck, Info, KeyRound } from 'lucide-react';
import { residentApi } from '../services/api';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [isResetView, setIsResetView] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  const targetAdminEmail = "admin@gatepass.com";
  const targetAdminPassword = "admin123";
  const defaultResidentPassword = "resident123";

  useEffect(() => {
    const paramEmail = searchParams.get('email');
    const paramOtp = searchParams.get('otp');
    if (paramEmail) setEmail(paramEmail);
    if (paramOtp) setEnteredOtp(paramOtp);
  }, [searchParams]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationError('');

    const formattedEmail = email.trim().toLowerCase();

    if (!formattedEmail.includes('@')) {
      setValidationError('Enter a valid email address to continue');
      setIsLoading(false);
      return;
    }

    try {
      if (formattedEmail === targetAdminEmail && password === targetAdminPassword) {
        localStorage.setItem('gatepass_token', 'true');
        localStorage.setItem('gatepass_role', 'admin');
        localStorage.removeItem('gatepass_resident_id');
        localStorage.removeItem('gatepass_resident_email');
        setIsLoading(false);
        navigate('/');
        return;
      }

      const residentsList = await residentApi.getAll();
      const matchedResident = residentsList.find(r => {
        const firstName = r.name.trim().split(' ')[0].toLowerCase();
        const flatClean = r.flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
        const expectedEmail = `${firstName}.${flatClean}@gatepass.com`;
        return formattedEmail === expectedEmail || r.email.toLowerCase() === formattedEmail;
      });

      if (matchedResident) {
        if (matchedResident.password === password) {
          if (matchedResident.isFirstLogin || password === defaultResidentPassword) {
            setResetUser(matchedResident);
            setIsResetView(true);
            setIsLoading(false);
            return;
          }

          localStorage.setItem('gatepass_token', 'true');
          localStorage.setItem('gatepass_role', 'resident');
          localStorage.setItem('gatepass_resident_id', matchedResident._id);
          localStorage.setItem('gatepass_resident_email', matchedResident.email);
          setIsLoading(false);
          navigate('/resident-dashboard');
          return;
        }
      }

      setValidationError('Access Denied. Check email or password.');
      setIsLoading(false);
    } catch (err) {
      setValidationError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationError('');

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      await residentApi.update(resetUser._id, {
        password: newPassword,
        otp: enteredOtp.trim()
      });

      localStorage.setItem('gatepass_token', 'true');
      localStorage.setItem('gatepass_role', 'resident');
      localStorage.setItem('gatepass_resident_id', resetUser._id);
      localStorage.setItem('gatepass_resident_email', resetUser.email);
      setIsLoading(false);
      navigate('/resident-dashboard');
    } catch (err) {
      setValidationError(err.message || 'OTP verification failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'relative', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-main)',
      overflow: 'hidden',
      padding: '24px 12px'
    }}>

      <div className="glow-circle glow-primary"></div>
      <div className="glow-circle glow-secondary"></div>

      <div className="glass-container" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '12px', 
            borderRadius: '16px', 
            background: 'rgba(99, 102, 241, 0.1)', 
            color: 'var(--primary)',
            marginBottom: '16px' 
          }}>
            {isResetView ? <KeyRound size={36} /> : <ShieldCheck size={36} />}
          </div>
          <h2 style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
            {isResetView ? 'Reset Default Password' : 'GatePass Pro'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            {isResetView 
              ? 'Complete first login password reset configuration' 
              : 'Society Gate Administrative Control Center'}
          </p>
        </div>
        
        {validationError && (
          <div style={{ 
            backgroundColor: 'var(--accent-light)', 
            color: 'var(--accent)', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '0.875rem', 
            marginBottom: '20px', 
            textAlign: 'center', 
            fontWeight: '600',
            border: '1px solid rgba(244, 63, 94, 0.15)'
          }}>
            {validationError}
          </div>
        )}

        {!isResetView ? (
          <form onSubmit={handleFormSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Email Address
              </label>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="e.g. admin@gatepass.com or rajesh.a101@gatepass.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setValidationError(''); }}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
                <Mail className="input-icon" size={20} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Password
              </label>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setValidationError(''); }}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
                <Lock className="input-icon" size={20} />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-global btn-primary" 
              style={{ width: '100%', fontSize: '1rem', height: '48px', marginBottom: '24px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner" style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block'
                }}></span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Enter OTP Code
              </label>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="6-digit verification code"
                  value={enteredOtp}
                  onChange={(e) => { setEnteredOtp(e.target.value); setValidationError(''); }}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
                <ShieldCheck className="input-icon" size={20} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                New Password
              </label>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setValidationError(''); }}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
                <Lock className="input-icon" size={20} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Confirm New Password
              </label>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setValidationError(''); }}
                  required
                  className="input-field"
                  disabled={isLoading}
                />
                <Lock className="input-icon" size={20} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                className="btn-global"
                onClick={() => setIsResetView(false)}
                style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-global btn-primary" 
                style={{ flex: 2, height: '48px' }}
                disabled={isLoading}
              >
                Reset & Sign In
              </button>
            </div>
          </form>
        )}

        <div style={{
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: 'var(--text-main)' }}>
            <Info size={14} style={{ color: 'var(--primary)' }} />
            <span>Developer Login Help:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
            <div><strong>Admin/Manager:</strong> admin@gatepass.com / <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>admin123</code></div>
            <div><strong>Citizen/Resident:</strong> firstname.flatnumber@gatepass.com / <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>resident123</code></div>
          </div>
        </div>
      </div>
      
      

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}