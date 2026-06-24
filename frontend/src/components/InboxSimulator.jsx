import { useState, useEffect } from 'react';
import { Mail, ChevronUp, ChevronDown, Trash2, ArrowUpRight, Copy, Check } from 'lucide-react';

export default function InboxSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const loadEmails = () => {
    const list = JSON.parse(localStorage.getItem('gatepass_sent_emails') || '[]');
    setEmails(list);
  };

  useEffect(() => {
    loadEmails();
    window.addEventListener('mock_email_sent', loadEmails);
    return () => {
      window.removeEventListener('mock_email_sent', loadEmails);
    };
  }, []);

  const handleClear = () => {
    localStorage.removeItem('gatepass_sent_emails');
    setEmails([]);
  };

  const handleCopyLink = (id, link) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-light)',
          border: 'none',
          padding: '12px 20px',
          borderRadius: '30px',
          fontWeight: '700',
          fontSize: '0.85rem',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'var(--transition)'
        }}
      >
        <Mail size={16} />
        <span>Mock Inbox Simulator ({emails.length})</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {isOpen && (
        <div style={{
          width: '380px',
          maxHeight: '450px',
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
            backgroundColor: 'rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>
              Society Manager Outbox Simulator
            </span>
            {emails.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={12} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {emails.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-light)',
                fontSize: '0.85rem'
              }}>
                📬 No emails sent yet. Add a resident in the admin panel to trigger a verification email.
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.8rem',
                    backgroundColor: 'rgba(0,0,0,0.01)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
                      {email.to}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                      {email.date}
                    </span>
                  </div>
                  
                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                    {email.subject}
                  </div>

                  <div style={{
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div>Username: <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{email.username}</code></div>
                    <div>Password: <code style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>resident123</code></div>
                    <div>OTP Code: <code style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>{email.otp}</code></div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => handleCopyLink(email.id, email.link)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedId === email.id ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === email.id ? 'Copied Link' : 'Copy Link'}</span>
                    </button>
                    <a
                      href={email.link}
                      style={{
                        flex: 1,
                        padding: '6px',
                        backgroundColor: 'var(--primary)',
                        color: 'var(--primary-light)',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Open Link</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
