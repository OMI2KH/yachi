// src/pages/ClientProfile.jsx
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import api from "../utils/api.js";

const ClientProfile = () => {
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) throw new Error("User not logged in");
        const res = await api.get(`/users/${user._id}`);
        setClient(res.data);
      } catch (err) {
        setError(err.message || "Failed to load client data");
      }
    };
    fetchClient();
  }, []);

  if (error) return <p className="text-red-500 text-center mt-6">{error}</p>;
  if (!client) return <p className="text-center mt-6">Loading profile...</p>;

  return (
    <div className="min-h-screen bg-light-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Client Profile</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <p><strong>Name:</strong> {client.name}</p>
          <p><strong>Email:</strong> {client.email}</p>
          <p><strong>Phone:</strong> {client.phone}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Bookings</h2>
          {client.bookings?.length > 0 ? (
            <ul>
              {client.bookings.map((b, i) => (
                <li key={i} className="border-b py-2">
                  {b.service} - {new Date(b.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No bookings yet.</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ClientProfile;
