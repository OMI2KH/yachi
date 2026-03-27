import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import api from "../utils/api.js";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await api.get("/transactions"); // Your backend endpoint
        setPayments(response.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load payments. Try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading payments...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;

  return (
    <div className="min-h-screen bg-light-cream">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Payments</h1>
        <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">Service</th>
                <th className="p-2">Amount (ETB)</th>
                <th className="p-2">Status</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b hover:bg-light-green transition">
                  <td className="p-2">{p.service}</td>
                  <td className="p-2">{p.amount}</td>
                  <td className={`p-2 font-semibold ${p.status === "Paid" ? "text-green-700" : "text-red-600"}`}>{p.status}</td>
                  <td className="p-2">{new Date(p.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}
