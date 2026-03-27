// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api.js";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Invalid user data in storage:", err);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      // (Optional) call API to invalidate token
      await api.post("/auth/logout");

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/auth"); // Redirect to login
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
      <Link to="/" className="text-xl font-bold tracking-wide">
        Yachi
      </Link>

      {user ? (
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">{user.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="space-x-4">
          <Link
            to="/auth/login"
            className="hover:underline focus:outline-none focus:ring-2 focus:ring-white"
          >
            Login
          </Link>
          <Link
            to="/auth/signup"
            className="bg-white text-blue-600 px-3 py-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Sign Up
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
