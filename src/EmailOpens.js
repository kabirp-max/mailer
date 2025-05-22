import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './EmailOpens.css';

const EmailOpens = () => {
  const [opens, setOpens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://track.techresearchcenter.com/api/opens')
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        if (Array.isArray(data)) {
          const seen = new Set();
          const filtered = data.filter((entry) => {
            const key = `${entry.id}_${entry.openTime}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setOpens(filtered);
        } else {
          console.error('Expected array, got:', data);
          setError('Unexpected response format.');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tracking data:', err);
        setError('Failed to fetch email open data.');
        setLoading(false);
      });
  }, []);

  // Function to handle Excel download
  const handleDownload = () => {
    if (opens.length === 0) return;

    // Prepare data for worksheet
    const dataForExcel = opens.map((open) => ({
      Email: open.email,
      Subject: open.subject,
      'Sent Time': new Date(open.sentTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      'Opened At': new Date(open.openTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      IP: open.ip,
      'Event ID': open.id,
    }));

    // Create a new workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EmailOpens');

    // Write workbook and create a Blob for download
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    // Use file-saver to save the file
    saveAs(blob, 'email-opens-data.xlsx');
  };

  return (
    <div className="email-opens-container">
      <h2 className="email-opens-title">📬 Email Open Events</h2>

      <button
        onClick={handleDownload}
        disabled={opens.length === 0}
        className="email-opens-download-btn"
      >
        Download Excel
      </button>

      {loading && <p className="email-opens-loading">Loading data...</p>}
      {error && <p className="email-opens-error">{error}</p>}

      {!loading && !error && (
        <>
          {opens.length === 0 ? (
            <p className="email-opens-empty">No email open data available.</p>
          ) : (
            <div className="email-opens-table-wrapper">
              <table className="email-opens-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Subject</th>
                    <th>Sent Time</th>
                    <th>Opened At</th>
                    <th>IP</th>
                    <th>Event ID</th>
                  </tr>
                </thead>
                <tbody>
                  {opens.map((open, index) => (
                    <tr key={index}>
                      <td>{open.email}</td>
                      <td>{open.subject}</td>
                      <td>{new Date(open.sentTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td>{new Date(open.openTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td>{open.ip}</td>
                      <td>{open.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmailOpens;
