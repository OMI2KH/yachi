// src/pages/Admin.jsx
import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import AdminTable from '../components/AdminTable.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/admin/users');
        setUsers(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load users. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleVerify = async (id) => {
    try {
      await api.put(`/admin/users/${id}/verify`);
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, verified: true } : u))
      );
    } catch (err) {
      console.error(err);
      alert('Failed to verify user. Try again.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="container mx-auto p-4 flex-1 space-y-6">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        {loading && <p>Loading users...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && <AdminTable data={users} onVerify={handleVerify} />}
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
