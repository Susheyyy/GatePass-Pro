import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck, Info } from 'lucide-react';
import { residentApi } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const targetAdminEmail = "admin@gatepass.com";
  const targetAdminPassword = "admin123";
  const defaultResidentPassword = "resident123";

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
      setTimeout(async () => {
        if (formattedEmail === targetAdminEmail && password === targetAdminPassword) {
          localStorage.setItem('gatepass_token', 'true');
          localStorage.setItem('gatepass_role', 'admin');
          localStorage.removeItem('gatepass_resident_id');
          localStorage.removeItem('gatepass_resident_email');
          setIsLoading(false);
          navigate('/');
          return;
        }

        if (password === defaultResidentPassword) {
          try {
            const residentsList = await residentApi.getAll();
            const matchedResident = residentsList.find(r => {
              const firstName = r.name.trim().split(' ')[0].toLowerCase();
              const flatClean = r.flatNo.toLowerCase().replace(/[^a-z0-9]/g, '');
              const expectedEmail = `${firstName}.${flatClean}@gatepass.com`;
              return formattedEmail === expectedEmail || r.email.toLowerCase() === formattedEmail;
            });

            if (matchedResident) {
              localStorage.setItem('gatepass_token', 'true');
              localStorage.setItem('gatepass_role', 'resident');
              localStorage.setItem('gatepass_resident_id', matchedResident._id);
              localStorage.setItem('gatepass_resident_email', matchedResident.email);
              setIsLoading(false);
              navigate('/resident-dashboard');
              return;
            }
          } catch (err) {
            console.error('Error verifying resident account:', err);
          }
        }

        setValidationError('Access Denied. Check email or password.');
        setIsLoading(false);
      }, 700);

    } catch (err) {
      setValidationError('An error occurred. Please try again.');
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
      backgroundColor: '#0f172a',
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
            <ShieldCheck size={36} />
          </div>
          <h2 style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
            GatePass Pro
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            Society Gate Administrative Control Center
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

        <form onSubmit={handleFormSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Email Address
            </label>
            <div className="input-group">
              <input
                type="email"
                placeholder="e.g. admin@gatepass.com or rajesh@gmail.com"
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

        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.03)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '0.8rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: 'var(--text-main)' }}>
            <Info size={14} className="text-primary" />
            <span>Developer Login Help:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
            <div><strong>Admin/Manager:</strong> admin@gatepass.com / <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>admin123</code></div>
            <div><strong>Citizen/Resident:</strong> firstname.flatnumber@gatepass.com / <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>resident123</code> (e.g. <code style={{ color: 'var(--primary)' }}>rajesh.a101@gatepass.com</code>)</div>
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