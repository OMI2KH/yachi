import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-900 text-gray-300 py-6 mt-10">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Branding */}
        <p className="text-sm">
          &copy; {year} <span className="font-semibold">Yachi</span>. All rights reserved.
        </p>

        {/* Links */}
        <nav className="flex gap-4 text-sm">
          <Link
            to="/privacy"
            className="hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="hover:text-white transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            to="/contact"
            className="hover:text-white transition-colors"
          >
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
