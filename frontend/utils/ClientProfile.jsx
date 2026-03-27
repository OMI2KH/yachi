import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api.js';
import io from 'socket.io-client';

const ClientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/clients/${id}`);
        setClient(response.data);
      } catch (err) {
        console.error('Failed to fetch client:', err);
        setError('Failed to load client data.');
      } finally {
        setLoading(false);
      }
    };

    fetchClient();

    // Initialize socket for real-time job updates
    socketRef.current = io(import.meta.env.VITE_API_URL);
    socketRef.current.on('jobUpdated', (updatedJob) => {
      if (updatedJob.clientId === id) {
        setClient(prev => {
          if (!prev) return prev;
          const jobs = prev.jobs?.map(j => j.id === updatedJob.id ? updatedJob : j) || [];
          return { ...prev, jobs };
        });
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [id]);

  if (loading) return <div className="text-center py-20">Loading client profile...</div>;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!client) return <div className="text-center py-20">Client not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4">{client.name}</h1>
        <p className="mb-1"><strong>Email:</strong> {client.email}</p>
        <p className="mb-4"><strong>Phone:</strong> {client.phoneNumber}</p>

        <button
          onClick={() => navigate(`/chat/${client.id}`)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Contact Client
        </button>

        {/* Jobs Section */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-3">Jobs Posted</h2>
          {client.jobs?.length > 0 ? (
            <div className="space-y-2">
              {client.jobs.map(j => (
                <div key={j.id} className="border p-3 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700">
                  <p><strong>{j.title}</strong></p>
                  <p>Budget: {j.budget} ETB</p>
                  <p>Status: {j.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No jobs posted</p>
          )}
        </div>

        {/* Ratings Section */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Ratings Given</h2>
          {client.ratings?.length > 0 ? (
            <div className="space-y-2">
              {client.ratings.map(r => (
                <div key={r.id} className="border p-3 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700">
                  <p><strong>{r.rating} ⭐</strong> – {r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No ratings given</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
