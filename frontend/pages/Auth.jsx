// src/pages/Auth.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import gsap from 'gsap';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, formData);

      // Store token and user info
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Authentication failed';
      setError(message);

      // Animate error
      gsap.fromTo(
        '#error',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5, onComplete: () => {
            gsap.to('#error', { opacity: 0, y: -20, delay: 3, duration: 0.5 });
          } 
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full glass p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">{isLogin ? 'Login' : 'Register'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              aria-label="Name"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input w-full"
            aria-label="Email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="input w-full"
            aria-label="Password"
            required
          />

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>

          {error && (
            <p
              id="error"
              className="text-red-500 mt-2 text-center opacity-0"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn-secondary w-full mt-2"
            onClick={() => setIsLogin(!isLogin)}
          >
            Switch to {isLogin ? 'Register' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
