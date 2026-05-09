import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Plus, Heart, MessageCircle, Pin } from 'lucide-react';

const TYPE_LABELS = { post: 'פוסט', announcement: 'הודעה', question: 'שאלה' };
const TYPE_COLORS = { post: 'bg-blue-100 text-blue-700', announcement: 'bg-orange-100 text-orange-700', question: 'bg-purple-100 text-purple-700' };

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [tab, setTab] = useState('posts');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ author_name: '', title: '', content: '', type: 'post' });
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');

  useEffect(() => {
    api.get('/community/posts').then(setPosts);
    api.get('/community/announcements').then(setAnnouncements);
  }, []);

  const selectPost = async (id) => {
    const data = await api.get(`/community/posts/${id}`);
    setSelectedPost(data);
  };

  const addPost = async (e) => {
    e.preventDefault();
    await api.post('/community/posts', form);
    setShowForm(false);
    setForm({ author_name: '', title: '', content: '', type: 'post' });
    api.get('/community/posts').then(setPosts);
  };

  const likePost = async (id) => {
    await api.post(`/community/posts/${id}/like`, {});
    api.get('/community/posts').then(setPosts);
    if (selectedPost?.id === id) {
      const updated = await api.get(`/community/posts/${id}`);
      setSelectedPost(updated);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!selectedPost) return;
    await api.post(`/community/posts/${selectedPost.id}/comments`, { author_name: commentAuthor, content: commentText });
    setCommentText('');
    const updated = await api.get(`/community/posts/${selectedPost.id}`);
    setSelectedPost(updated);
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">קהילה</h1>
          <p className="text-slate-500 text-sm">פוסטים, הודעות ועדכונים</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm">
          <Plus size={16} /> פוסט חדש
        </button>
      </div>

      {announcements.length > 0 && (
        <div className="space-y-2 mb-6">
          {announcements.map(a => (
            <div key={a.id} className={`rounded-xl p-4 border ${a.priority === 'high' ? 'bg-red-50 border-red-200' : a.priority === 'low' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="font-bold text-sm mb-1">{a.title}</div>
              <div className="text-sm text-slate-700">{a.content}</div>
              <div className="text-xs text-slate-500 mt-1">{a.author} • {a.created_at?.split('T')[0]}</div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <form onSubmit={addPost} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="שמך *" value={form.author_name} onChange={e => setForm({...form, author_name: e.target.value})} required />
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="post">פוסט</option>
                <option value="question">שאלה</option>
                <option value="announcement">הודעה</option>
              </select>
            </div>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="כותרת" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none" placeholder="תוכן הפוסט *" value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
            <div className="flex gap-2">
              <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-sky-700">פרסם</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">ביטול</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:border-sky-200 border border-transparent transition-colors" onClick={() => selectPost(post.id)}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {post.pinned === 1 && <Pin size={14} className="text-orange-500" />}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[post.type] || 'bg-gray-100'}`}>
                    {TYPE_LABELS[post.type] || post.type}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{post.created_at?.split('T')[0]}</span>
              </div>
              {post.title && <h3 className="font-bold text-slate-800 mb-1">{post.title}</h3>}
              <p className="text-sm text-slate-700 line-clamp-2">{post.content}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="font-medium text-slate-600">{post.author_name}</span>
                <button onClick={(e) => { e.stopPropagation(); likePost(post.id); }} className="flex items-center gap-1 hover:text-red-500 transition-colors">
                  <Heart size={14} /> {post.likes}
                </button>
                <span className="flex items-center gap-1"><MessageCircle size={14} /> {post.comment_count}</span>
              </div>
            </div>
          ))}
        </div>

        {selectedPost && (
          <div className="w-96 bg-white rounded-xl shadow-sm p-5 self-start sticky top-4">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-slate-800">{selectedPost.title || 'פוסט'}</h3>
              <button onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="text-xs text-slate-500 mb-2">{selectedPost.author_name} • {selectedPost.created_at?.split('T')[0]}</div>
            <p className="text-sm text-slate-700 mb-4">{selectedPost.content}</p>

            <div className="border-t pt-4">
              <div className="font-medium text-sm text-slate-700 mb-3">תגובות ({selectedPost.comments?.length || 0})</div>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {selectedPost.comments?.map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-lg p-2 text-xs">
                    <span className="font-medium">{c.author_name}: </span>
                    <span className="text-slate-700">{c.content}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={addComment} className="space-y-2">
                <input className="w-full border rounded-lg px-3 py-1.5 text-xs" placeholder="שמך" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} required />
                <div className="flex gap-2">
                  <input className="flex-1 border rounded-lg px-3 py-1.5 text-xs" placeholder="כתוב תגובה..." value={commentText} onChange={e => setCommentText(e.target.value)} required />
                  <button type="submit" className="bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-sky-700">שלח</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
