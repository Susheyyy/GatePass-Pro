import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck, Info, KeyRound, Eye, EyeOff, Shield } from 'lucide-react';
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

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

      if (formattedEmail === 'security@gatepass.com' && password === 'security123') {
        localStorage.setItem('gatepass_token', 'true');
        localStorage.setItem('gatepass_role', 'security');
        localStorage.removeItem('gatepass_resident_id');
        localStorage.removeItem('gatepass_resident_email');
        setIsLoading(false);
        navigate('/visitors');
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
      backgroundColor: '#f5f0f6',
      overflow: 'hidden',
      padding: '40px 16px',
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        backgroundColor: 'rgba(50, 11, 53, 0.35)',
        filter: 'blur(100px)',
        top: '-10%',
        left: '-10%',
        zIndex: 1
      }}></div>
      <div style={{
        position: 'absolute',
        width: '550px',
        height: '550px',
        borderRadius: '50%',
        backgroundColor: 'rgba(247, 228, 147, 0.35)',
        filter: 'blur(120px)',
        bottom: '-10%',
        right: '-10%',
        zIndex: 1
      }}></div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: '28px',
        boxShadow: '0 20px 40px -15px rgba(50, 11, 53, 0.08)',
        border: '1px solid rgba(50, 11, 53, 0.08)',
        padding: '44px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: 'white',
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(50, 11, 53, 0.2)'
          }}>
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
              {isResetView ? 'Configure Account' : 'GatePass Pro'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              {isResetView ? 'Choose a secure password for your profile.' : 'Society Gate Control & Administrative Center'}
            </p>
          </div>
        </div>

        {validationError && (
          <div style={{
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '600',
            border: '1px solid rgba(244, 63, 94, 0.15)',
            textAlign: 'center'
          }}>
            {validationError}
          </div>
        )}

        {!isResetView ? (
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setValidationError(''); }}
                  placeholder="name@gatepass.com"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    backgroundColor: 'white',
                    transition: 'var(--transition)'
                  }}
                  className="login-input"
                />
                <Mail size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setValidationError(''); }}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    backgroundColor: 'white',
                    transition: 'var(--transition)'
                  }}
                  className="login-input"
                />
                <Lock size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(50, 11, 53, 0.15)',
                transition: 'var(--transition)',
                marginTop: '10px'
              }}
            >
              {isLoading ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Enter OTP Code
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={enteredOtp}
                  onChange={(e) => { setEnteredOtp(e.target.value); setValidationError(''); }}
                  placeholder="6-digit verification code"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    backgroundColor: 'white'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                New Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setValidationError(''); }}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    backgroundColor: 'white'
                  }}
                />
                <Lock size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setValidationError(''); }}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    backgroundColor: 'white'
                  }}
                />
                <Lock size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsResetView(false)}
                style={{
                  flex: 1,
                  backgroundColor: 'white',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border)',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'var(--transition)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  flex: 2,
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'var(--transition)'
                }}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Reset & Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div style={{
          backgroundColor: 'rgba(50, 11, 53, 0.02)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
            <Info size={14} style={{ color: 'var(--primary)' }} />
            <span>Developer Login Help:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><strong>Admin:</strong> admin@gatepass.com / <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>admin123</code></div>
            <div><strong>Security:</strong> security@gatepass.com / <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>security123</code></div>
            <div><strong>Resident:</strong> firstname.flatnumber@gatepass.com / <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>resident123</code></div>
          </div>
        </div>
      </div>

      <style>{`
        .login-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(50, 11, 53, 0.05);
        }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          borderRadius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}