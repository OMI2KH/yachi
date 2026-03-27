// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getMe, getProducts } from "../utils/api.js";
import ServiceCard from "../components/ServiceCard.jsx";
import PaymentSelector from "../components/PaymentSelector.jsx";
import SearchBar from "../components/SearchBar.jsx";
import gsap from "gsap";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [earnings, setEarnings] = useState({ transactions: [], totalEarnings: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch user, products, and earnings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getMe();
        setUser(userData);

        const productData = await getProducts();
        setProducts(productData);

        const earningsData = await api.get("/earnings");
        setEarnings(earningsData.data);
      } catch (err) {
        setError("Failed to load data. Please log in again.");
        localStorage.removeItem("token");
        navigate("/auth");
      }
    };
    fetchData();

    // Animate dashboard cards
    gsap.from(".dashboard-card", {
      opacity: 0,
      y: 50,
      stagger: 0.2,
      duration: 1,
      ease: "power3.out",
    });
  }, [navigate]);

  // Filter products by search
  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chartData = {
    labels: earnings.transactions.map((tx) =>
      new Date(tx.createdAt).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Earnings (ETB)",
        data: earnings.transactions.map(
          (tx) => tx.amount * (user?.isPremium ? 0.95 : 0.9)
        ),
        backgroundColor: "#10b981",
      },
    ],
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* User Info */}
        {user && (
          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
            <p className="text-lg">Email: {user.email}</p>
            {user.isPremium ? (
              <span className="ml-4 text-yellow-500">Premium Member</span>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await api.post("/payments/subscribe");
                    setUser({ ...user, isPremium: true });
                  } catch (err) {
                    alert("Subscription failed: " + err.message);
                  }
                }}
                className="ml-4 p-2 bg-yellow-500 text-white rounded"
              >
                Become Premium
              </button>
            )}
          </div>
        )}

        {/* Earnings Overview */}
        <h2 className="text-2xl font-semibold mb-4">Earnings Overview</h2>
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p>Total Earnings: {earnings.totalEarnings.toFixed(2)} ETB</p>
          <Bar data={chartData} options={{ responsive: true }} />
        </div>

        {/* Search Bar */}
        <SearchBar
          query={searchQuery}
          onChange={setSearchQuery}
          onSearch={(q) => console.log("Search executed: ", q)}
        />

        {/* Services */}
        <h2 className="text-2xl font-semibold mb-4">Available Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product._id} className="dashboard-card">
              <ServiceCard service={product} />
              <PaymentSelector serviceId={product._id} price={product.price} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
