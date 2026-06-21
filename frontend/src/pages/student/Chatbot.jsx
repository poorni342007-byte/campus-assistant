import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../api';

function Chatbot({ user }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: '👋 Hello! I am CampusAI, your academic assistant. How can I help you today? You can ask me about your grades, attendance, bunk recommendations, or for study advice!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendChatMessage = async (textToSend) => {
    const msgText = textToSend || chatInput;
    if (!msgText.trim()) return;

    const userMsg = { role: 'user', text: msgText };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');

    setChatLoading(true);
    setChatError('');

    try {
      const historyToSend = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const data = await api.post('/api/chatbot', {
        student_id: user.id,
        message: msgText,
        history: historyToSend
      });

      setMessages(prev => [...prev, { role: 'model', text: data.response }]);
    } catch (err) {
      setChatError(err.message || 'Failed to generate response. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const suggestions = [
    "Analyze my current performance 📊",
    "Can I bunk Math II tomorrow? 🙊",
    "What is my current CGPA? 🎓",
    "How many credits have I completed? 📐"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '800px', margin: '0 auto' }}>

      {/* Chat Intro Card */}
      <div className="info-card" style={{ maxWidth: 'none', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🤖</span> CampusAI Grounded Advisor
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '5px' }}>
          Ask me anything! I am directly synced with your real-time course grades and attendance records. I can help calculate bunking limits, credit standings, or provide study strategies.
        </p>
      </div>

      {/* Chat Window */}
      <div className="info-card" style={{
        maxWidth: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '520px',
        padding: '0',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(10, 11, 20, 0.3)'
      }}>

        {/* Scrollable messages area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '25px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 18px',
                  borderRadius: '16px',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  color: '#ffffff',
                  background: isUser
                    ? 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isUser ? '0 4px 15px rgba(99, 102, 241, 0.25)' : 'none',
                  borderBottomRightRadius: isUser ? '4px' : '16px',
                  borderBottomLeftRadius: isUser ? '16px' : '4px'
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {chatLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
              <div style={{
                maxWidth: '80%',
                padding: '12px 18px',
                borderRadius: '16px',
                borderBottomLeftRadius: '4px',
                fontSize: '0.95rem',
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Loader2 className="animate-spin" size={16} />
                <span>CampusAI is thinking...</span>
              </div>
            </div>
          )}

          {chatError && (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div className="alert alert-error" style={{ margin: 0, padding: '10px 16px' }}>
                ⚠️ {chatError}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Container */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.1)'
        }}>
          {suggestions.map((sug, i) => (
            <button
              key={i}
              disabled={chatLoading}
              onClick={() => handleSendChatMessage(sug)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Chat input form */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }}
          style={{
            display: 'flex',
            padding: '15px 20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(5, 6, 11, 0.6)'
          }}
        >
          <input
            type="text"
            className="form-control"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={chatLoading ? "Please wait for AI response..." : "Ask CampusAI (e.g., How is my attendance?)"}
            disabled={chatLoading}
            style={{
              borderTopRightRadius: '0',
              borderBottomRightRadius: '0',
              backgroundColor: 'rgba(10, 11, 20, 0.8)',
              borderRight: 'none'
            }}
          />
          <button
            type="submit"
            className="btn"
            disabled={chatLoading || !chatInput.trim()}
            style={{
              width: '100px',
              borderTopLeftRadius: '0',
              borderBottomLeftRadius: '0',
              boxShadow: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)'
            }}
          >
            Send
          </button>
        </form>

      </div>

    </div>
  );
}

export default Chatbot;
