import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import ProfileForm from '../components/ProfileForm.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profiles/me');
        setUser(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (formData) => {
    try {
      const res = await api.put('/profiles/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile. Please try again.');
    }
  };

  if (loading) return <p className="text-center mt-10">Loading profile...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;

  return (
    <div className="min-h-screen bg-light-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6 space-y-2">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Description:</strong> {user.description || 'N/A'}</p>
          <p><strong>Country:</strong> {user.country || 'N/A'}</p>
          <p><strong>Referral Code:</strong> {user.referralCode || 'N/A'}</p>
          <p><strong>Discount:</strong> {user.referralDiscount || 0}%</p>
          {user.role === 'provider' && (
            <p><strong>Availability:</strong> {user.availability || 'Not set'}</p>
          )}
        </div>

        <ProfileForm user={user} onSubmit={handleSubmit} />
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
