// src/components/RatingForm.jsx
import React, { useState } from 'react';
import api from '../utils/api.js';

const RatingForm = ({ serviceId, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!review.trim()) {
      setMessage({ type: 'error', text: 'Review cannot be empty' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post('/ratings', { serviceId, rating, review });
      setMessage({ type: 'success', text: 'Rating submitted successfully!' });
      setReview('');
      setRating(5);
      if (onSuccess) onSuccess();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-md max-w-md mx-auto">
      <label className="block font-medium">Rating</label>
      <select
        value={rating}
        onChange={e => setRating(Number(e.target.value))}
        className="border p-2 rounded w-full"
      >
        {[1, 2, 3, 4, 5].map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      <label className="block font-medium">Review</label>
      <textarea
        value={review}
        onChange={e => setReview(e.target.value)}
        className="border p-2 rounded w-full"
        placeholder="Write your review..."
        rows={4}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Rating'}
      </button>

      {message && (
        <p className={`mt-2 text-center ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
};

export default RatingForm;
