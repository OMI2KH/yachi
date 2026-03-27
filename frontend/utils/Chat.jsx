import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from './api.js';
import { io } from 'socket.io-client';

const Chat = () => {
  const { jobId } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Initialize socket
    socketRef.current = io(import.meta.env.VITE_API_URL);

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const response = await api.get(`/messages?jobId=${jobId}`);
        setMessages(response.data);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };
    fetchMessages();

    // Listen for new messages
    const handleNewMessage = (msg) => {
      if (msg.jobId === jobId) setMessages(prev => [...prev, msg]);
    };
    socketRef.current.on('newMessage', handleNewMessage);

    return () => {
      socketRef.current.off('newMessage', handleNewMessage);
      socketRef.current.disconnect();
    };
  }, [jobId]);

  useEffect(() => {
    const container = containerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isAtBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!content.trim()) return;
    setLoading(true);

    // Optimistic UI update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      senderName: 'You',
      content,
      jobId,
    };
    setMessages(prev => [...prev, tempMessage]);
    setContent('');

    try {
      const response = await api.post('/messages', { jobId, content });
      setMessages(prev => prev.map(m => (m.id === tempMessage.id ? response.data : m)));
      socketRef.current.emit('sendMessage', response.data);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col">
        <h1 className="text-3xl font-bold mb-4">Chat for Job #{jobId}</h1>
        <div
          ref={containerRef}
          className="flex-1 h-64 overflow-y-auto mb-4 border p-2 rounded bg-gray-50 dark:bg-gray-700"
        >
          {messages.map((m) => (
            <p key={m.id} className="mb-2 break-words">
              <strong>{m.senderName || m.senderId}:</strong> {m.content}
            </p>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !content.trim()}
            className={`p-2 rounded text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
