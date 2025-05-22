import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import './EmailOpens.css'; // Reuse existing styles

const EmailBounces = () => {
  const [bounces, setBounces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://track.techresearchcenter.com/api/bounces')
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (Array.isArray(data)) {
          setBounces(data);
        } else {
          setError('Unexpected response format');
        }
      })
      .catch(err => {
        console.error('Bounce fetch failed:', err);
        setError('Failed to fetch bounce data.');
        setLoading(false);
      });
  }, []);

  const downloadExcel = () => {
    if (bounces.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(bounces);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bounces');

    // Auto fit columns
    const columnWidths = Object.keys(bounces[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...bounces.map((item) => (item[key] ? item[key].toString().length : 0))
      );
      return { wch: maxLength + 5 };
    });
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, 'email_bounces.xlsx');
  };

  return (
    <div className="email-opens-container">
      <h2 className="email-opens-title">📛 Email Bounce Events</h2>

      {loading && <p className="email-opens-loading">Loading bounce data...</p>}
      {error && <p className="email-opens-error">{error}</p>}

      {!loading && !error && (
        <>
          <button className="btn export-btn" onClick={downloadExcel}>
            ⬇️ Download Full Excel
          </button>

          {bounces.length === 0 ? (
            <p className="email-opens-empty">No bounce records found.</p>
          ) : (
            <div className="email-opens-table-wrapper">
              <table className="email-opens-table">
                <thead>
                  <tr>
                    {Object.keys(bounces[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bounces.map((bounce, index) => (
                    <tr key={index}>
                      {Object.keys(bounce).map((key) => (
                        <td key={key} style={{ maxWidth: '400px', wordBreak: 'break-word' }}>
                          {bounce[key]}
                        </td>
                      ))}
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

export default EmailBounces;
