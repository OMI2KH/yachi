// src/components/ProfileForm.jsx
import React, { useState } from 'react';

const ProfileForm = ({ user, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    description: user.description || '',
    profilePhoto: user.profilePhoto || '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) form.append(key, formData[key]);
      });
      if (file) form.append('idDocument', file);

      await onSubmit(form);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        className="border p-2 w-full rounded"
        placeholder="Name"
        required
      />
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        className="border p-2 w-full rounded"
        placeholder="Description"
        rows={4}
      />
      <input
        name="profilePhoto"
        value={formData.profilePhoto}
        onChange={handleChange}
        className="border p-2 w-full rounded"
        placeholder="Photo URL"
      />
      {user.role === 'provider' && (
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/jpeg,image/png,application/pdf"
          className="border p-2 rounded w-full"
        />
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-green-500 text-white p-2 rounded w-full hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? "Updating..." : "Update Profile"}
      </button>
    </form>
  );
};

export default ProfileForm;
