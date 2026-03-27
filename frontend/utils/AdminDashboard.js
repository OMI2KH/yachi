import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api, { getMe, getProducts } from './api.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SkeletonCard = () => (
  <div className="dashboard-card animate-pulse bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mt-2"></div>
  </div>
);

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [earnings, setEarnings] = useState({ transactions: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getMe();
        setUser(userData);

        const productData = await getProducts({ local: true });
        setProducts(productData);

        const earningsData = await api.get('/earnings');
        setEarnings(earningsData.data);

        setLoading(false);

        // Animate product cards
        gsap.from('.dashboard-card', {
          opacity: 0,
          y: 50,
          stagger: 0.2,
          duration: 0.8,
          ease: 'power3.out',
        });
      } catch (err) {
        setError('Failed to load data. Please log in again.');
        localStorage.removeItem('token');
        navigate('/auth');
      }
    };

    fetchData();
  }, [navigate]);

  const chartData = {
    labels: earnings.transactions.map((tx) => new Date(tx.createdAt).toLocaleDateString()),
    datasets: [
      {
        label: 'Earnings (ETB)',
        data: earnings.transactions.map((tx) => tx.amount),
        backgroundColor: '#10b981',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Earnings Overview' } },
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* User Info */}
        {user && !loading && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
            <p className="text-lg">Email: {user.email}</p>
            {user.isPremium ? (
              <span className="ml-4 text-yellow-500 font-semibold">Premium Member</span>
            ) : (
              <button
                onClick={() => api.post('/payments/subscribe')}
                className="ml-4 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
              >
                Become Premium
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Earnings Chart */}
        {!loading && earnings.transactions.length > 0 && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="font-semibold mb-2">Total Earnings: {earnings.total.toFixed(2)} ETB</p>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Products */}
        <h2 className="text-2xl font-semibold mb-4">Available Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((product) => (
                <div key={product.id} className="dashboard-card transition hover:shadow-lg">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold">{product.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{product.description}</p>
                    <p className="text-lg font-bold mt-2">
                      {product.price} {product.country === 'ET' ? 'ETB' : 'USD'}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
