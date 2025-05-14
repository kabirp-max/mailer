import React, { useState } from 'react';

function EmailUploader({ onEmailsExtracted }) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [emailColumn, setEmailColumn] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('http://localhost:4000/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    setHeaders(data.headers);
    setRows(data.rows);
  };

  const extractEmails = () => {
    const colIndex = headers.indexOf(emailColumn);
    const emails = rows.map(row => row[colIndex]).filter(Boolean);
    onEmailsExtracted(emails);
  };

  return (
    <div>
      <h2>Upload CSV/XLS File</h2>
      <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} />

      {headers.length > 0 && (
        <>
          <h3>Select Email Column:</h3>
          <select onChange={(e) => setEmailColumn(e.target.value)} defaultValue="">
            <option value="" disabled>Select column</option>
            {headers.map((header, i) => (
              <option key={i} value={header}>{header}</option>
            ))}
          </select>
          <button onClick={extractEmails}>Extract Emails</button>
        </>
      )}
    </div>
  );
}

export default EmailUploader;
