import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, User, Phone, Home, Users, ArrowLeft } from 'lucide-react';
import { residentApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const toast = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    flatNo: '',
    name: '',
    mobile: '',
    gmail: '',
    members: '1'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setCaptchaQuestion(`What is ${num1} + ${num2}?`);
    setCaptchaAnswer((num1 + num2).toString());
  };

  useEffect(() => {
    document.title = 'Register | GatePass Pro';
    generateCaptcha();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (honeypot) {
      setIsLoading(false);
      return;
    }

    if (captchaInput.trim() !== captchaAnswer) {
      toast.warning('Incorrect security verification answer.');
      setIsLoading(false);
      generateCaptcha();
      return;
    }

    if (!/^[a-zA-Z]+-\d+$/.test(formData.flatNo.trim())) {
      toast.warning('Flat Number must be in Alphabet-number format (e.g. A-102, B-405)');
      setIsLoading(false);
      return;
    }
    
    if (!/^\d+$/.test(formData.mobile.trim())) {
      toast.warning('Mobile Number must contain only digits');
      setIsLoading(false);
      return;
    }
    
    if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com)$/i.test(formData.gmail.trim())) {
      toast.warning('Gmail Address must end with a standard provider (e.g. @gmail.com, @yahoo.com)');
      setIsLoading(false);
      return;
    }
    
    if (!/^\d+$/.test(formData.members.toString().trim())) {
      toast.warning('Total Family Members must contain only digits');
      setIsLoading(false);
      return;
    }

    try {
      await residentApi.create({
        ...formData,
        members: parseInt(formData.members) || 1,
        isSelfRegistration: true
      });
      setIsSuccess(true);
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please check details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(circle at 10% 20%, rgba(50, 11, 53, 0.05) 0%, rgba(255, 255, 255, 1) 90%)',
      overflow: 'hidden'
    }}>
      <div className="glow-circle glow-primary"></div>
      <div className="glow-circle glow-secondary"></div>

      <div className="glass-container" style={{ maxWidth: '480px' }}>
        
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '24px',
            padding: '4px 0',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </button>

        {!isSuccess ? (
          <>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em', marginBottom: '8px' }}>
                Join Your Community
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Request a resident account. Admin approval is required to activate.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Flat Number *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="flatNo"
                    value={formData.flatNo}
                    onChange={handleInputChange}
                    placeholder="e.g. A-102"
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                  <Home size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                  <User size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mobile Number *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="10-digit number"
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                  <Phone size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Gmail Address *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="email"
                    name="gmail"
                    value={formData.gmail}
                    onChange={handleInputChange}
                    placeholder="username@gmail.com"
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                  <Mail size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Family Members *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="members"
                    value={formData.members}
                    onChange={handleInputChange}
                    placeholder="Number of members"
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                  <Users size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div style={{ display: 'none' }}>
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Security Verification: {captchaQuestion} *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Enter sum answer"
                    required
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
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
                {isLoading ? <span className="spinner"></span> : <span>Request Registration</span>}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              fontSize: '2rem'
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
              Registration Requested!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '24px' }}>
              Your account request for Flat <strong>{formData.flatNo}</strong> is pending administrator review. You will receive an email welcome link containing your credentials once approved.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'var(--transition)'
              }}
            >
              Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
