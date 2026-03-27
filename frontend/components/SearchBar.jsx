// src/components/SearchBar.jsx
import React, { useState, useEffect } from 'react';

const SearchBar = ({ query, onChange, onSearch }) => {
  const [localOnly, setLocalOnly] = useState(true);
  const [error, setError] = useState('');
  const [internalQuery, setInternalQuery] = useState(query || '');

  useEffect(() => {
    setInternalQuery(query || '');
  }, [query]);

  const handleSearch = () => {
    if (!internalQuery.trim()) {
      setError('Please enter a search term');
      return;
    }
    setError('');
    const params = localOnly
      ? `?local=true&search=${encodeURIComponent(internalQuery)}`
      : `?search=${encodeURIComponent(internalQuery)}`;
    onSearch(params);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex flex-col mb-8 space-y-4 p-6 rounded-xl bg-white/10 backdrop-blur-md shadow-lg">
      <div className="flex items-center space-x-4">
        <input
          type="text"
          value={internalQuery}
          onChange={(e) => { setInternalQuery(e.target.value); onChange(e.target.value); }}
          onKeyPress={handleKeyPress}
          placeholder="Search services (e.g., plumbing, tutoring)"
          className="flex-1 px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent text-gray-900"
          aria-label="Search services"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-dark transition"
          aria-label="Search"
        >
          Search
        </button>
      </div>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={localOnly}
          onChange={() => setLocalOnly(!localOnly)}
          className="h-5 w-5 text-accent focus:ring-accent border-gray-300 rounded"
        />
        <span className="text-sm text-gray-300">Show local services only</span>
      </label>

      {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
    </div>
  );
};

export default SearchBar;
