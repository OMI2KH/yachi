// src/components/PaymentSelector.jsx
import { useState } from "react";
import Select from "react-select";
import api from "../utils/api.js";

const PaymentSelector = ({ serviceId, price }) => {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const options = [
    { value: "easycash", label: "EasyCash" },
    { value: "telebirr", label: "Telebirr" },
    { value: "cbe", label: "CBE Birr" },
  ];

  const handlePayment = async () => {
    if (!paymentMethod) return alert("Select a payment method");
    if ((paymentMethod === "telebirr" || paymentMethod === "cbe") && !phoneNumber)
      return alert("Phone number is required");

    setLoading(true);
    setMessage("");

    try {
      let res;
      if (paymentMethod === "easycash") {
        res = await api.post("/payments/easycash", { serviceId });
      } else if (paymentMethod === "telebirr") {
        res = await api.post("/payments/telebirr", { serviceId, phoneNumber });
      } else if (paymentMethod === "cbe") {
        res = await api.post("/payments/cbe", { serviceId, phoneNumber });
      }

      setMessage(res.data.message || "Payment successful!");
    } catch (err) {
      console.error(err);
      setMessage("Payment failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white/10 backdrop-blur-md rounded-lg">
      <Select
        options={options}
        onChange={(option) => setPaymentMethod(option.value)}
        placeholder="Select Payment Method"
        className="mb-4 text-black"
      />

      {(paymentMethod === "telebirr" || paymentMethod === "cbe") && (
        <input
          type="text"
          placeholder="Enter phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full p-2 mb-4 text-black rounded border"
        />
      )}

      <button
        onClick={handlePayment}
        disabled={!paymentMethod || loading}
        className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : `Pay ${price} ETB`}
      </button>

      {message && <p className="mt-2 text-center text-green-600">{message}</p>}
    </div>
  );
};

export default PaymentSelector;
