// src/components/ChatWindow.jsx
import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import api from '../utils/api.js';

const socket = io(import.meta.env.VITE_API_URL, { transports: ['websocket'] });

const ChatWindow = ({ receiverId }) => {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/${receiverId}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    fetchMessages();

    socket.emit('join', receiverId);

    const handleNewMessage = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [receiverId]);

  useEffect(() => {
    // scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!content.trim()) return;
    setSending(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const messageData = { senderId: user._id, receiverId, content };
      
      socket.emit('sendMessage', messageData);
      setMessages(prev => [...prev, { ...messageData, _id: Date.now() }]); // optimistic UI
      setContent('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded p-2 bg-white dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages.map(msg => {
          const user = JSON.parse(localStorage.getItem('user'));
          const isSelf = msg.senderId === user._id;
          return (
            <div
              key={msg._id}
              className={`p-2 rounded ${isSelf ? 'bg-green-200 self-end' : 'bg-gray-200 self-start'}`}
            >
              <span className="font-semibold">{isSelf ? 'You' : msg.senderId}:</span> {msg.content}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="border rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Type a message..."
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={sending || !content.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
