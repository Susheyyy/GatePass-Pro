import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getUserFromToken, residentApi } from '../services/api';
import { isDemoSession } from '../services/demo';

export default function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('gatepass_token');
  const user = getUserFromToken();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ token: null, error: '', ready: false });
  useEffect(() => {
    const expire = () => setAttempt(value => value + 1);
    window.addEventListener('gatepass_session_expired', expire);
    return () => window.removeEventListener('gatepass_session_expired', expire);
  }, []);
  useEffect(() => {
    if (!token || isDemoSession()) return;
    let active = true;
    residentApi.me().then(() => {
      if (active) setState({ token, ready: true, error: '' });
    }).catch(error => {
      if (active) setState({ token, ready: false, error: error.message });
    });
    const delay = Math.max(0, (user?.exp || 0) * 1000 - Date.now());
    const timer = setTimeout(() => {
      sessionStorage.removeItem('gatepass_token');
      sessionStorage.removeItem('gatepass_user');
      window.dispatchEvent(new Event('gatepass_session_expired'));
    }, delay);
    return () => { active = false; clearTimeout(timer); };
  }, [token, attempt, user?.exp]);
  if (!user) return <Navigate to="/login" replace />;
  if (isDemoSession()) return children;
  if (state.token === token && state.ready) return children;
  if (state.token === token && state.error) return <div role="alert" style={{ padding: '32px' }}>{state.error}<button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></div>;
  return <div role="status" style={{ padding: '32px' }}>Checking your session…</div>;
}
