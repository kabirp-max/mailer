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

  const [manualMode, setManualMode] = useState(false);
const [manualContacts, setManualContacts] = useState([{ email: "" }]);

const [deleteId, setDeleteId] = useState(null);
const [showConfirm, setShowConfirm] = useState(false);

const confirmDelete = (id) => {
  setDeleteId(id);
  setShowConfirm(true);
};

const handleDelete = async () => {
  try {
    const res = await fetch(`http://localhost:4000/api/contact-lists/${deleteId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete list");

    setLists(lists.filter((list) => list.id !== deleteId));
    setSaveStatus("List deleted successfully");
  } catch (err) {
    alert("Error deleting list: " + err.message);
  } finally {
    setShowConfirm(false);
    setDeleteId(null);
  }
};


const handleManualContactChange = (index, value) => {
  const updated = [...manualContacts];
  updated[index].email = value;
  setManualContacts(updated);
};

const addManualContact = () => {
  setManualContacts([...manualContacts, { email: "" }]);
};

const saveManualList = async () => {
  if (!listName.trim()) {
    alert("Please enter a list name");
    return;
  }
  const emails = manualContacts.map(c => c.email.trim()).filter(e => e);
  if (emails.length === 0) {
    alert("Please enter at least one valid email");
    return;
  }

  setSaving(true);
  try {
    const res = await fetch("http://localhost:4000/api/contact-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: listName.trim(),
        emails: emails,
      }),
    });

    if (!res.ok) throw new Error("Failed to save contact list");

    setSaveStatus("Manual list saved!");
    setManualContacts([{ email: "" }]);
    setListName("");
    fetchLists();
  } catch (err) {
    setSaveStatus("Error: " + err.message);
  } finally {
    setSaving(false);
  }
};


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

<button onClick={() => setManualMode(!manualMode)} className="manual-toggle-btn">
  {manualMode ? "Cancel Manual Entry" : "Add Contacts Manually"}
</button>

{manualMode && (
  <div className="manual-entry-section">
    <h3>Manual Contact Entry</h3>
    {manualContacts.map((contact, index) => (
      <div key={index} className="manual-contact-row">
        <input
          type="email"
          placeholder="Email"
          value={contact.email}
          onChange={(e) => handleManualContactChange(index, e.target.value)}
        />
      </div>
    ))}
    <button onClick={addManualContact} className="add-more-btn">+ Add More</button>

    <div className="list-input">
      <input
        type="text"
        placeholder="Enter list name"
        value={listName}
        onChange={(e) => setListName(e.target.value)}
      />
      <button onClick={saveManualList} disabled={saving} className="save-btn">
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
      <th>Actions</th>
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
        <td>
          <button
            onClick={() => confirmDelete(list.id)}
            className="delete-btn"
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

)}
    {showConfirm && (
  <div className="modal-overlay">
    <div className="confirm-modal">
      <p>Are you sure you want to delete this list?</p>
      <button onClick={handleDelete} className="confirm-btn">Yes, Delete</button>
      <button onClick={() => setShowConfirm(false)} className="cancel-btn">Cancel</button>
    </div>
  </div>
)}

    </div>
    
  );
}

export default ContactsPage;
