import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Clock, User, FileText, X } from 'lucide-react';
import { postApi, residentApi } from '../services/api';
import { FormButton, FormInput } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

export default function Community() {
  const toast = useToast();
  const userRole = localStorage.getItem('gatepass_role') || 'admin';
  const residentId = localStorage.getItem('gatepass_resident_id');
  const residentEmail = localStorage.getItem('gatepass_resident_email');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentResident, setCurrentResident] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [publishing, setPublishing] = useState(false);

  const fetchData = async () => {
    try {
      const allPosts = await postApi.getAll();
      setPosts(allPosts);
      
      if (userRole === 'resident') {
        const list = await residentApi.getAll();
        const matched = list.find(r => r._id === residentId || r.email.toLowerCase() === residentEmail?.toLowerCase());
        if (matched) {
          setCurrentResident(matched);
        }
      }
    } catch (err) {
      toast.error('Failed to load community board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole, residentId, residentEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.warning('Please fill in all fields.');
      return;
    }
    setPublishing(true);
    try {
      const postPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        authorName: currentResident ? currentResident.name : 'Resident',
        flatNo: currentResident ? currentResident.flatNo : 'N/A'
      };
      const created = await postApi.create(postPayload);
      setPosts(prev => [created, ...prev]);
      setFormData({ title: '', description: '' });
      setIsModalOpen(false);
      toast.success('Post published to community board!');
    } catch (err) {
      toast.error('Failed to publish post.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Community Board
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            View and publish posts shared across the organization.
          </p>
        </div>

        {userRole === 'resident' && (
          <FormButton onClick={() => setIsModalOpen(true)} variant="primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>Post</span>
          </FormButton>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
            <span>Community Feed</span>
          </h3>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <span>Loading posts...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="content-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.95rem' }}>No community posts shared yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map((post) => (
                <div key={post._id} className="content-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                      {post.title}
                    </h4>
                    
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontWeight: '700',
                      fontSize: '0.8rem'
                    }}>
                      <User size={12} />
                      <span>{post.authorName} ({post.flatNo})</span>
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {post.description}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    <Clock size={12} />
                    <span>{new Date(post.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div className="content-card" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '30px',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <button onClick={() => setIsModalOpen(false)} style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.02)'
            }}>
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>Share a Post</span>
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormInput
                label="Post Title"
                placeholder="e.g. Maintenance Scheduled"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                icon={FileText}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                  Message Details <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <textarea
                  placeholder="Describe your announcement or concern..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'var(--transition)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '12px' }}>
                <FormButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </FormButton>
                <FormButton type="submit" variant="primary" disabled={publishing} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>{publishing ? 'Publishing...' : 'Publish Post'}</span>
                </FormButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
