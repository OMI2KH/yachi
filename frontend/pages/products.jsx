import React, { useState, useEffect } from "react";
import api from "../utils/api.js";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import PaymentSelector from "../components/PaymentSelector.jsx";
import gsap from "gsap";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get("/products"); // Fetch from backend
        setProducts(response.data);
        setLoading(false);

        // Animate product cards
        gsap.from(".product-card", {
          opacity: 0,
          y: 50,
          stagger: 0.2,
          duration: 0.8,
          ease: "power3.out",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load products. Please try again later.");
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search query
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-light-cream">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Products</h1>

        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {loading && <p className="text-center text-gray-600">Loading products...</p>}
        {error && <p className="text-center text-red-600">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading &&
            filteredProducts.map((product) => (
              <div
                key={product._id}
                className="product-card bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition"
              >
                <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                <p className="text-gray-700 mb-2">Price: {product.price} ETB</p>
                <PaymentSelector serviceId={product._id} price={product.price} />
              </div>
            ))}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <p className="text-center text-gray-500 mt-4">No products found.</p>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Products;
