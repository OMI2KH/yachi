import React from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import Hero from "../components/Hero.jsx";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/index.jsx";
import Admin from "../pages/admin.jsx";
import Auth from "../pages/Auth.jsx";
import Dashboard from "../pages/dashboard.jsx";
import Profile from "../pages/profile.jsx";
import ClientProfile from "../pages/clientprofile.jsx";
import Payments from "../pages/payments.jsx";
import Products from "../pages/products.jsx";
import WorkerProfile from "../pages/workerprofile.jsx";
import ServicePage from "../pages/service/[id].jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-light-cream font-sans">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/clientprofile" element={<ClientProfile />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/products" element={<Products />} />
        <Route path="/workerprofile" element={<WorkerProfile />} />
        <Route path="/service/:id" element={<ServicePage />} />
      </Routes>
      <Footer />
    </div>
  );
}
