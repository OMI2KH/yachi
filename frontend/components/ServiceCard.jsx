import React, { useEffect } from 'react';
import gsap from 'gsap';
import { createTransaction, payWithTelebirr, payWithCBE, payWithEasyCash } from '../utils/api.js';

const ServiceCard = ({ service, onBook, className }) => {
  useEffect(() => {
    gsap.from(`#service-${service._id}`, {
      opacity: 0,
      scale: 0.95,
      duration: 0.5,
      ease: 'power2.out',
    });
  }, [service._id]);

  const handleBook = async () => {
    try {
      // Create a transaction locally
      const transaction = await createTransaction({
        productId: service._id,
        paymentMethod: 'telebirr', // default method; can integrate UI later to choose
        customerName: 'Anonymous',  // replace with actual user input if needed
        customerPhone: '0000000000', // replace with actual user input
      });

      // Example: auto-pay with Telebirr for now
      const paymentResponse = await payWithTelebirr(transaction.id);
      alert(`Payment successful! Reference: ${paymentResponse.reference}`);

      if (onBook) onBook(service._id);
    } catch (error) {
      console.error('Booking error:', error);
      alert('Booking failed. Please try again.');
    }
  };

  return (
    <div id={`service-${service._id}`} className={`p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>
      <h3 className="text-xl font-semibold">{service.title}</h3>
      <p className="text-gray-300">{service.description}</p>
      <p className="text-sm text-gray-400">Location: {service.country}</p>
      <p className="text-accent font-bold mt-2">{service.price} ETB</p>
      <button
        onClick={handleBook}
        className="mt-4 w-full px-4 py-2 bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-600 transition"
      >
        Book Now
      </button>
    </div>
  );
};

export default ServiceCard;
