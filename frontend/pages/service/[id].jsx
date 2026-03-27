// src/pages/service/Service.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api.js';
import BookingForm from '../../components/BookingForm.jsx';
import RatingForm from '../../components/RatingForm.jsx';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';

const Service = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        setService(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load service.');
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id]);

  if (loading) return <p className="text-center mt-10">Loading service details...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!service) return <p className="text-center mt-10">Service not found.</p>;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="container mx-auto p-4 flex-1 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-2">{service.title}</h1>
          <p className="text-gray-300 mb-1">Price: {service.price} ETB</p>
          <p className="text-gray-300 mb-1">Provider: {service.userId?.name}</p>
          <p className="text-gray-300 mb-4">Availability: {service.userId?.availability || 'N/A'}</p>
        </div>

        <BookingForm serviceId={service._id} />
        <RatingForm serviceId={service._id} />
      </main>
      <Footer />
    </div>
  );
};

export default Service;
