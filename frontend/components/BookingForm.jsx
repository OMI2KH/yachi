// src/components/BookingForm.jsx
import React, { useState } from "react";
import api, { createTransaction, payWithTelebirr, payWithCBE, payWithEasyCash } from "../utils/api.js";

const BookingForm = ({ serviceId }) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("telebirr");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      // Step 1: create transaction
      const transaction = await createTransaction({
        productId: serviceId,
        paymentMethod,
        customerName,
        customerPhone,
      });

      // Step 2: process payment depending on method
      let paymentResponse;
      switch (paymentMethod) {
        case "telebirr":
          paymentResponse = await payWithTelebirr(transaction.id);
          break;
        case "cbe":
          paymentResponse = await payWithCBE(transaction.id);
          break;
        case "easycash":
          paymentResponse = await payWithEasyCash(transaction.id);
          break;
        default:
          throw new Error("Invalid payment method selected.");
      }

      setSuccessMessage(`Payment successful! Reference: ${paymentResponse.reference}`);
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Payment failed. Please try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Book This Service</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1" htmlFor="customerName">Name</label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            minLength={2}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="block font-medium mb-1" htmlFor="customerPhone">Phone</label>
          <input
            id="customerPhone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
            pattern="[0-9]{9,15}"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <div>
          <label className="block font-medium mb-1" htmlFor="paymentMethod">Payment Method</label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="telebirr">Telebirr</option>
            <option value="cbe">CBE Birr</option>
            <option value="easycash">EasyCash</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 text-white font-semibold py-2 rounded hover:bg-yellow-600 transition flex justify-center items-center"
        >
          {loading ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            "Book & Pay"
          )}
        </button>

        {successMessage && <p className="text-green-600 mt-2">{successMessage}</p>}
        {errorMessage && <p className="text-red-600 mt-2">{errorMessage}</p>}
      </form>
    </div>
  );
};

export default BookingForm;
