import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, X } from 'lucide-react';
import { postApi, residentApi } from '../services/api';
import { FormButton, FormInput } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';

const getCategoryStyle = (category) => {
  switch (category) {
    case 'Notice':
      return { backgroundColor: '#FEF3C7', color: '#D97706' };
    case 'Event':
      return { backgroundColor: '#EEF2FF', color: '#4F46E5' };
    case 'Complaint':
      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    case 'Lost & Found':
      return { backgroundColor: '#CCFBF1', color: '#0D9488' };
    default:
      return { backgroundColor: '#F3F4F6', color: '#4B5563' };
  }
};

export default function Community() {
  const toast = useToast();
  const userRole = localStorage.getItem('gatepass_role') || 'admin';
  const residentId = localStorage.getItem('gatepass_resident_id');
  const residentEmail = localStorage.getItem('gatepass_resident_email');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentResident, setCurrentResident] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General'
  });
  const [publishing, setPublishing] = useState(false);

  const fetchData = async () => {
    try {
      const allPosts = await postApi.getAll();
      setPosts(allPosts);
      
      if (userRole === 'resident') {
        let matched = null;
        if (residentId) {
          matched = await residentApi.getById(residentId);
        } else {
          const list = await residentApi.getAll();
          matched = list.find(r => r.email.toLowerCase() === residentEmail?.toLowerCase());
        }
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
      const created = await postApi.create(
        formData.title.trim(),
        formData.description.trim(),
        formData.category
      );
      setPosts(prev => [created, ...prev]);
      setFormData({ title: '', description: '', category: 'General' });
      setIsModalOpen(false);
      toast.success('Post published to community board!');
    } catch (err) {
      toast.error('Failed to publish post.');
    } finally {
      setPublishing(false);
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;
    try {
      const updatedPost = await postApi.addComment(postId, commentText);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: updatedPost.comments } : p));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      toast.success('Comment added successfully!');
    } catch (err) {
      toast.error('Failed to add comment.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Community Feed
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
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        ...getCategoryStyle(post.category)
                      }}>
                        {post.category || 'General'}
                      </span>
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
                        <span>{post.authorName} ({post.flatNo})</span>
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {post.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    <Clock size={12} />
                    <span>{new Date(post.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                      Comments ({(post.comments || []).length})
                    </div>
                    
                    {(post.comments || []).length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '10px', borderLeft: '2px solid var(--border)', marginBottom: '8px' }}>
                        {post.comments.map((comment, index) => (
                          <div key={comment._id || index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                {comment.authorName} ({comment.flatNo})
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                                {new Date(comment.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                              {comment.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <form onSubmit={(e) => handleCommentSubmit(e, post._id)} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentInputs[post._id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-sans)',
                          outline: 'none'
                        }}
                      />
                      <FormButton type="submit" variant="primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        Reply
                      </FormButton>
                    </form>
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
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                  Category <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    transition: 'var(--transition)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                >
                  <option value="General">General</option>
                  <option value="Notice">Notice</option>
                  <option value="Event">Event</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Lost & Found">Lost & Found</option>
                </select>
              </div>

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
