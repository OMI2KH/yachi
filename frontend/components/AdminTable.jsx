// src/components/AdminTable.jsx
import React from 'react';

const AdminTable = ({ data = [], onVerify }) => {
  if (!data.length) {
    return <p className="text-gray-500 text-center py-4">No users found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-auto w-full border-collapse border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 border-b">Name</th>
            <th className="px-4 py-2 border-b">Role</th>
            <th className="px-4 py-2 border-b">Verified</th>
            <th className="px-4 py-2 border-b">ID Document</th>
            <th className="px-4 py-2 border-b">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map(user => (
            <tr key={user._id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">{user.name}</td>
              <td className="px-4 py-2 border-b">{user.role}</td>
              <td className="px-4 py-2 border-b">{user.verified ? 'Yes' : 'No'}</td>
              <td className="px-4 py-2 border-b">
                {user.idDocument ? (
                  <a
                    href={user.idDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View ID
                  </a>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="px-4 py-2 border-b">
                {!user.verified && (
                  <button
                    onClick={() => onVerify(user._id)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    Verify
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;
