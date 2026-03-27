import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import PaymentSelector from '../components/PaymentSelector.jsx';
import api from '../utils/api.js';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL);

const Home = () => {
  const [services, setServices] = useState([]);
  const [query, setQuery] = useState('');
  const [notification, setNotification] = useState('');

  // Listen for booking updates from backend
  useEffect(() => {
    socket.on('bookingUpdate', (data) => {
      setNotification(`Booking confirmed for ${data.serviceTitle}`);
      setTimeout(() => setNotification(''), 3000);
    });
    return () => socket.off('bookingUpdate');
  }, []);

  // Fetch services based on search query
  const handleSearch = async (queryString) => {
    try {
      const response = await api.get(`/products${queryString}`);
      setServices(response.data);
    } catch (error) {
      console.error('Search error:', error);
      setNotification('Failed to fetch services.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Local booking handler
  const handleBook = async (serviceId, price) => {
    try {
      const transaction = await api.post('/transactions', { serviceId, price });
      socket.emit('bookService', { serviceId, transactionId: transaction.data._id });
      setNotification('Booking initiated! Complete payment below.');
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      console.error('Booking error:', err);
      setNotification('Booking failed. Try again.');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Yachi Global Marketplace</h1>

      <SearchBar query={query} onChange={setQuery} onSearch={handleSearch} />

      {notification && <p className="alert">{notification}</p>}

      {services.length === 0 && (
        <p className="text-center text-gray-500 mt-8">No services found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {services.map((service) => (
          <div key={service._id} className="space-y-2">
            <ServiceCard service={service} onBook={() => handleBook(service._id, service.price)} />
            <PaymentSelector serviceId={service._id} price={service.price} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
