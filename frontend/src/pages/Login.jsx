import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const navigate = useNavigate();

  const targetEmail = "admin@gatepass.com";
  const targetPassword = "admin123";

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!email.includes('@')) {
      setValidationError('Enter a valid email address to continue');
      return;
    }

    if (email === targetEmail && password === targetPassword) {
      localStorage.setItem('gatepass_token', 'true');
      navigate('/');
    } else {
      setValidationError('Access Denied. Check email or password.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <div className="content-card" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <h2 style={{ color: 'var(--primary)', textAlign: 'center', marginBottom: '24px' }}>Sign-In</h2>
        
        {validationError && (
          <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>
            {validationError}
          </p>
        )}

        <form onSubmit={handleFormSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="email"
              placeholder="Enter email address "
              value={email}
              onChange={(e) => { setEmail(e.target.value); setValidationError(''); }}
              required
              style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setValidationError(''); }}
              required
              style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>

          <button type="submit" className="btn-global btn-success" style={{ width: '100%', fontSize: '1rem' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}