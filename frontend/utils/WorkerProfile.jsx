import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from './api.js';
import Webcam from 'react-webcam';

const WorkerProfile = () => {
  const { id } = useParams();
  const webcamRef = useRef(null);

  const [worker, setWorker] = useState(null);
  const [availability, setAvailability] = useState('Available');
  const [faydaFile, setFaydaFile] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch worker data
  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const response = await api.get(`/api/workers/${id}`);
        setWorker(response.data);
        setAvailability(response.data.availability);
      } catch (err) {
        console.error('Failed to fetch worker:', err);
      }
    };
    fetchWorker();
  }, [id]);

  // Toggle availability
  const handleAvailability = async () => {
    try {
      const newAvailability = availability === 'Available' ? 'Busy' : 'Available';
      await api.put(`/api/workers/availability`, { availability: newAvailability });
      setAvailability(newAvailability);
    } catch (err) {
      console.error('Failed to update availability:', err);
    }
  };

  // Generic file upload handler
  const handleFileUpload = async (url, files) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => formData.append(url.includes('portfolio') ? 'portfolio' : url.includes('documents') ? 'documents' : 'faydaId', file));
    try {
      setLoading(true);
      await api.post(url, formData);
      alert(`${url.includes('portfolio') ? 'Portfolio' : url.includes('documents') ? 'Documents' : 'Fayda ID'} uploaded successfully`);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Selfie capture
  const handleSelfieCapture = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    const blob = await (await fetch(imageSrc)).blob();
    const formData = new FormData();
    formData.append('selfie', blob, 'selfie.jpg');

    try {
      setLoading(true);
      await api.post('/api/workers/selfie-verify', formData);
      alert('Selfie verified successfully');
    } catch (err) {
      console.error('Selfie verification failed:', err);
      alert('Selfie verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Verified badge payment
  const handleVerifiedBadgePayment = async () => {
    try {
      // Use platform payment initiation endpoint (Ethiopian providers)
      const response = await api.post('/api/payments/initiate', {
        type: 'verified_badge',
        itemId: id,
        amount: 499,
        currency: 'ETB',
        paymentMethod: 'chapa'
      });

      // If the provider returned a checkout URL, redirect; otherwise handle client-side flow
      const checkout = response.data?.data?.gateway?.checkoutUrl || response.data?.data?.paymentIntent?.checkoutUrl;
      if (checkout) window.location.href = checkout;
    } catch (err) {
      console.error('Payment session failed:', err);
      alert('Payment failed');
    }
  };

  if (!worker) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
        <h1 className="text-3xl font-bold">
          {worker.name} {worker.verifiedBadge && '✅'}
        </h1>
        <p>Email: {worker.email}</p>
        <p>Phone: {worker.phoneNumber}</p>
        <p>Level: {worker.level}</p>
        <p>
          Verification: {worker.faydaVerified ? 'Fayda Verified' : 'Pending'} |{' '}
          {worker.selfieVerified ? 'Selfie Verified' : 'Pending'} |{' '}
          {worker.documentVerified ? 'Documents Verified' : 'Pending'}
        </p>

        <div className="flex flex-wrap gap-2">
          <button onClick={handleAvailability} className="p-2 bg-blue-500 text-white rounded">
            Set {availability === 'Available' ? 'Busy' : 'Available'}
          </button>
          {!worker.verifiedBadge && (
            <button onClick={handleVerifiedBadgePayment} className="p-2 bg-green-500 text-white rounded">
              Get Verified Badge (399 ETB)
            </button>
          )}
        </div>

        {/* Fayda ID Upload */}
        <div>
          <h2 className="font-semibold">Fayda ID Upload</h2>
          <input type="file" onChange={(e) => setFaydaFile([e.target.files[0]])} />
          <button onClick={() => handleFileUpload('/api/workers/fayda-upload', faydaFile)} className="p-2 bg-green-500 text-white rounded mt-2">
            Upload Fayda ID
          </button>
        </div>

        {/* Selfie */}
        <div>
          <h2 className="font-semibold">Selfie Verification</h2>
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="mb-2 rounded" />
          <button onClick={handleSelfieCapture} className="p-2 bg-green-500 text-white rounded">
            Capture Selfie
          </button>
        </div>

        {/* Documents */}
        <div>
          <h2 className="font-semibold">Documents Upload</h2>
          <input type="file" multiple onChange={(e) => setDocuments([...e.target.files])} />
          <button onClick={() => handleFileUpload('/api/workers/document-upload', documents)} className="p-2 bg-green-500 text-white rounded mt-2">
            Upload Documents
          </button>
        </div>

        {/* Portfolio */}
        <div>
          <h2 className="font-semibold">Portfolio Upload</h2>
          <input type="file" multiple onChange={(e) => setPortfolio([...e.target.files])} />
          <button onClick={() => handleFileUpload('/api/workers/portfolio-upload', portfolio)} className="p-2 bg-green-500 text-white rounded mt-2">
            Upload Portfolio
          </button>
        </div>

        {/* Ratings */}
        <div>
          <h2 className="font-semibold">Ratings</h2>
          {worker.ratings?.length > 0 ? (
            worker.ratings.map((r) => (
              <div key={r.id} className="border p-2 rounded mb-2 space-y-1">
                <p>{r.rating} stars: {r.comment}</p>
                {r.photos?.map((p, idx) => <img key={idx} src={p} alt="Rating" className="max-h-24 rounded" />)}
              </div>
            ))
          ) : (
            <p>No ratings yet</p>
          )}
        </div>

        {loading && <p className="text-blue-500">Processing...</p>}
      </div>
    </div>
  );
};

export default WorkerProfile;
