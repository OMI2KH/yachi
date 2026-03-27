import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Animate hero section
    gsap.from('.hero', {
      opacity: 0,
      y: 100,
      duration: 1.5,
      ease: 'power3.out',
    });
  }, []);

  return (
    <div className="min-h-screen bg-light-cream dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-center p-4">
      <div className="hero max-w-3xl text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-deep-green dark:text-white">
          Yachi Global Marketplace
        </h1>
        <p className="text-xl md:text-2xl mb-6 text-gray-700 dark:text-gray-300">
          Connect with service providers worldwide.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="bg-deep-green text-white px-8 py-3 rounded-lg hover:bg-dark-green transition"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default Home;
