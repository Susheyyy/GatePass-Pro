import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const targetEmail = "admin@gatepass.com";
  const targetPassword = "admin123";

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.includes('@')) {
      setValidationError('Enter a valid email address to continue');
      setIsLoading(false);
      return;
    }

    // Simulate a brief premium loading animation
    setTimeout(() => {
      if (email === targetEmail && password === targetPassword) {
        localStorage.setItem('gatepass_token', 'true');
        navigate('/');
      } else {
        setValidationError('Access Denied. Check email or password.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div style={{ 
      position: 'relative', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#0f172a', /* Deep Slate dark bg for contrasting the glowing circles */
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Glow Blobs */}
      <div className="glow-circle glow-primary"></div>
      <div className="glow-circle glow-secondary"></div>

      {/* Glass Auth Card */}
      <div className="glass-container">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
            Administrative Control Center Sign-In
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
                placeholder="admin@gatepass.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setValidationError(''); }}
                required
                className="input-field"
                disabled={isLoading}
              />
              <Mail className="input-icon" size={20} />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
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
            style={{ width: '100%', fontSize: '1rem', height: '48px' }}
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
                display: 'inline-block',
                marginRight: '8px'
              }}></span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In to System</span>
              </>
            )}
          </button>
        </form>
      </div>
      
      {/* Simple global keyframes inline style for loading spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}