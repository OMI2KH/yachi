import React from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

export default function WorkerProfile() {
  const worker = {
    name: "Samuel Mekonnen",
    profession: "Carpenter",
    rating: 4.8,
    completedJobs: 23,
    phone: "+251 987 654 321",
    bio: "Experienced carpenter specializing in furniture and home improvements. Highly reliable and skilled."
  };

  return (
    <div className="min-h-screen bg-light-cream flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Worker Profile</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6 space-y-3">
          <p><strong>Name:</strong> {worker.name}</p>
          <p><strong>Profession:</strong> {worker.profession}</p>
          <p><strong>Rating:</strong> {worker.rating} / 5 ⭐</p>
          <p><strong>Completed Jobs:</strong> {worker.completedJobs}</p>
          <p><strong>Phone:</strong> {worker.phone}</p>
          <p className="mt-2 text-gray-700">{worker.bio}</p>
        </div>

        <div className="text-center">
          <a
            href={`tel:${worker.phone}`}
            className="inline-block bg-deep-green text-white px-6 py-3 rounded-lg hover:bg-dark-green transition font-semibold"
          >
            Contact Worker
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
