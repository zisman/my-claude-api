import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';
import { Bot, Send, User, Trash2 } from 'lucide-react';

const SUGGESTIONS = [
  'מה תנאי מזג האוויר הטובים לטיסה?',
  'מה ההבדל בין כנף P2 ל-P3?',
  'איך בוחרים ציוד לתלמיד מתחיל?',
  'מה נהלי הבטיחות לפני טיסה?',
  'תסביר לי על תרמיקה',
  'מה כדאי לבדוק בציוד לפני עונת הקיץ?',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'שלום! אני העוזר החכם של מועדון מצנחי הרחיפה. אני מומחה בטיסה, ציוד, בטיחות ומטאורולוגיה. במה אוכל לעזור?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const assistantMsg = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      await api.streamChat(apiMessages, (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'מצטער, אירעה שגיאה. אנא נסה שוב.' };
        return updated;
      });
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: 'שלום! אני העוזר החכם של מועדון מצנחי הרחיפה. אני מומחה בטיסה, ציוד, בטיחות ומטאורולוגיה. במה אוכל לעזור?' }]);
  };

  return (
    <div className="flex flex-col h-screen p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">עוזר AI</h1>
          <p className="text-slate-500 text-sm">מופעל על ידי Claude Opus 4.7</p>
        </div>
        <button onClick={clearChat} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Trash2 size={14} /> נקה שיחה
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-sky-600' : 'bg-purple-600'}`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {msg.content}
                {loading && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-4">
            <div className="text-xs text-slate-500 mb-2">הצעות:</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-sky-100 hover:text-sky-700 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t p-4">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <input
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="שאל אותי כל שאלה על טיסת מצנח רחיפה..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="bg-sky-600 text-white px-4 py-2.5 rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-colors">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
