import React, { useEffect, useState } from 'react';

const EmailOpens = () => {
  const [opens, setOpens] = useState([]);
  const [loading, setLoading] = useState(true);  // For loading state
  const [error, setError] = useState(null);  // For error handling

 useEffect(() => {
  fetch('http://localhost:4000/api/opens')
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) {
        setOpens(data);
      } else {
        console.error('Expected array, got:', data);
        setOpens([]);
      }
    })
    .catch((err) => {
      console.error('Failed to fetch tracking data:', err);
      setOpens([]);
    });
}, []);


  if (loading) {
    return <div>Loading...</div>; // You can improve this with a spinner or other loading indicators
  }

  if (error) {
    return <div>{error}</div>; // Display error if any
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Email Open Events</h2>
      {opens.length === 0 ? (
        <p>No email opens data available.</p>  // Display if there are no records
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">User ID</th>
              <th className="border p-2">IP Address</th>
              <th className="border p-2">User Agent</th>
              <th className="border p-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {opens.map((open, index) => (
              <tr key={index} className="border-t">
                <td className="border p-2">{open.id}</td>
                <td className="border p-2">{open.ip}</td>
                <td className="border p-2">{open.ua}</td>
                <td className="border p-2">{open.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EmailOpens;
