import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Loader2, AlertTriangle, Check, X, Plus } from 'lucide-react';
import { api } from '../../api';

function AnnouncementManager({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('Alert');
  const [priority, setPriority] = useState('High');
  const [expiresAt, setExpiresAt] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/dashboard/announcements?student_id=${user.id}`);
      setAnnouncements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setPostError('Title and content are required.');
      return;
    }
    setPosting(true);
    setPostError('');
    setPostSuccess('');
    try {
      await api.post('/api/announcements', {
        title: title.trim(),
        content: content.trim(),
        type,
        priority,
        expires_at: expiresAt || null
      });
      setTitle('');
      setContent('');
      setExpiresAt('');
      setPostSuccess('Announcement published!');
      fetchAnnouncements();
    } catch (err) {
      setPostError(err.message || 'Failed to create announcement.');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/api/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = async (id) => {
    try {
      await api.put(`/api/announcements/${id}`, {
        title: editData.title,
        content: editData.content,
        type: editData.type,
        priority: editData.priority,
        expires_at: editData.expires_at || null
      });
      setEditingId(null);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to update announcement.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#06b6d4' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

      {/* Create Announcement */}
      <div className="info-card" style={{ maxWidth: 'none', padding: '25px' }}>
        <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Publish New Announcement
        </h3>

        {postError && <div className="alert alert-error"><AlertTriangle size={14} /> {postError}</div>}
        {postSuccess && <div className="alert alert-success"><Check size={14} /> {postSuccess}</div>}

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Title</label>
            <input type="text" className="form-control" placeholder="Announcement Title" required
              value={title} onChange={(e) => setTitle(e.target.value)} disabled={posting} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Content</label>
            <textarea className="form-control" placeholder="Announcement body text..." required
              style={{ height: '100px', resize: 'vertical' }}
              value={content} onChange={(e) => setContent(e.target.value)} disabled={posting} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Type</label>
              <select className="form-control" value={type} onChange={(e) => setType(e.target.value)} disabled={posting}>
                <option>Alert</option>
                <option>Update</option>
                <option>Event</option>
                <option>Notice</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Priority</label>
              <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value)} disabled={posting}>
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Expires At (optional)</label>
              <input type="date" className="form-control" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={posting} />
            </div>
          </div>

          <button type="submit" className="btn" style={{ fontSize: '0.9rem' }} disabled={posting}>
            {posting ? <><Loader2 className="animate-spin" size={16} /> Publishing...</> : 'Publish Announcement'}
          </button>
        </form>
      </div>

      {/* Announcement List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h3 style={{ fontSize: '1.15rem', color: '#ffffff' }}>Published Announcements ({announcements.length})</h3>

        {announcements.map(ann => (
          <div key={ann.id} className="info-card" style={{
            maxWidth: 'none',
            padding: '20px',
            borderLeft: ann.priority === 'High' ? '4px solid #ef4444' : '4px solid #3b82f6'
          }}>
            {editingId === ann.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" className="form-control" value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                <textarea className="form-control" style={{ height: '80px', resize: 'vertical' }}
                  value={editData.content} onChange={(e) => setEditData({ ...editData, content: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <select className="form-control" value={editData.type} onChange={(e) => setEditData({ ...editData, type: e.target.value })}>
                    <option>Alert</option><option>Update</option><option>Event</option><option>Notice</option>
                  </select>
                  <select className="form-control" value={editData.priority} onChange={(e) => setEditData({ ...editData, priority: e.target.value })}>
                    <option>High</option><option>Normal</option><option>Low</option>
                  </select>
                  <input type="date" className="form-control" value={editData.expires_at || ''} onChange={(e) => setEditData({ ...editData, expires_at: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleEdit(ann.id)} className="btn" style={{ flex: 1, fontSize: '0.85rem', padding: '10px' }}>Save</button>
                  <button onClick={() => setEditingId(null)} style={{
                    flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600'
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: '600' }}>{ann.title}</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
                      backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', color: '#94a3b8'
                    }}>
                      {ann.type}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{ann.date}</span>
                    <button onClick={() => { setEditingId(ann.id); setEditData({ title: ann.title, content: ann.content, type: ann.type, priority: ann.priority, expires_at: ann.expires_at || '' }); }}
                      style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', padding: '2px' }}>
                      <Edit size={15} />
                    </button>
                    <button onClick={() => handleDelete(ann.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>{ann.content}</p>
                {ann.expires_at && (
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '8px' }}>
                    Expires: {new Date(ann.expires_at).toLocaleDateString()}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {announcements.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
            No announcements published yet. Create one above.
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}
    </div>
  );
}

export default AnnouncementManager;
