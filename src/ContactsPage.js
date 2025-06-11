import React, { useEffect, useState } from "react";
import "./styles/ContactsPage.css";
import { Link } from "react-router-dom";

function ContactsPage() {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [emailColumn, setEmailColumn] = useState("");
  const [extractedEmails, setExtractedEmails] = useState([]);

  const [listName, setListName] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [errorLists, setErrorLists] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:4000/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload file");

      const data = await res.json();
      setHeaders(data.headers || []);
      setRows(data.rows || []);
      setEmailColumn("");
      setExtractedEmails([]);
      setSaveStatus(null);
      setListName("");
    } catch (err) {
      alert("Error uploading file: " + err.message);
    }
  };

  const extractEmails = () => {
    if (!emailColumn) {
      alert("Please select an email column");
      return;
    }
    const colIndex = headers.indexOf(emailColumn);
    if (colIndex === -1) return;

    const emails = rows
      .map((row) => row[colIndex])
      .filter((email) => email && email.toString().trim() !== "");
    setExtractedEmails(emails);
    setSaveStatus(null);
  };

  const saveList = async () => {
    if (!listName.trim()) {
      alert("Please enter a list name");
      return;
    }
    if (extractedEmails.length === 0) {
      alert("No emails to save");
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch("http://localhost:4000/api/contact-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: listName.trim(),
          emails: extractedEmails,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save contact list");
      }

      setSaveStatus("List saved successfully!");
      setExtractedEmails([]);
      setListName("");
      setHeaders([]);
      setRows([]);
      fetchLists();
    } catch (err) {
      setSaveStatus("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchLists = async () => {
    setLoadingLists(true);
    setErrorLists(null);
    try {
      const res = await fetch("http://localhost:4000/api/contact-lists");
      if (!res.ok) throw new Error("Failed to fetch contact lists");
      
      const data = await res.json();
      console.log(data);
      setLists(data.lists || []);
    } catch (err) {
      setErrorLists(err.message);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  return (
    <div className="contacts-page">
      <h2>Upload Excel/CSV File & Extract Emails</h2>
      <input
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={handleFile}
        className="file-input"
      />

      {headers.length > 0 && (
        <>
          <label className="select-label">
            Select Email Column:{" "}
            <select
              value={emailColumn}
              onChange={(e) => setEmailColumn(e.target.value)}
              className="select-dropdown"
            >
              <option value="">-- Select column --</option>
              {headers.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <button onClick={extractEmails} className="extract-btn">
            Extract Emails
          </button>
        </>
      )}

      {extractedEmails.length > 0 && (
        <div className="emails-preview">
          <h3>Extracted Emails ({extractedEmails.length})</h3>
          <ul>
            {extractedEmails.map((email, i) => (
              <li key={i}>{email}</li>
            ))}
          </ul>

          <div className="list-input">
            <input
              type="text"
              placeholder="Enter list name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
            <button onClick={saveList} className="save-btn" disabled={saving}>
              {saving ? "Saving..." : "Save List"}
            </button>
          </div>
          {saveStatus && <p className="status-message">{saveStatus}</p>}
        </div>
      )}

      <hr style={{ margin: "40px 0" }} />

      <h2>Contact Lists</h2>
{loadingLists && <p>Loading contact lists...</p>}
{errorLists && <p className="error">Error: {errorLists}</p>}
{!loadingLists && lists.length === 0 && <p>No contact lists found.</p>}

{lists.length > 0 && (
  <table className="contact-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Contacts</th>
      </tr>
    </thead>
    <tbody>
      {lists.map((list) => (
        <tr key={list.id}>
          <td>
            <Link to={`/contacts/${list.id}`} className="list-link">
              {list.name}
            </Link>
          </td>
          <td>{list.contacts.length}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}
    </div>
  );
}

export default ContactsPage;
