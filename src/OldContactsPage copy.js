import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

export default function OldContactsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formStates, setFormStates] = useState({}); // per-list add contact form state

  // Excel Upload States
  const [excelFile, setExcelFile] = useState(null);

const [listName, setListName] = useState("");

  const [excelColumns, setExcelColumns] = useState([]); // [{ name, checked, mapping }]
  const [excelData, setExcelData] = useState([]); // raw data rows from Excel
  const [uploadListName, setUploadListName] = useState("");
  const [uploadError, setUploadError] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
//   const [excelFile, setExcelFile] = useState(null);
// const [listName, setListName] = useState("");
const [listDescription, setListDescription] = useState("");
const [columnMapping, setColumnMapping] = useState({
  email: "",   // required
  name: "",    // optional
  phone: "",   // optional
  // ...other custom fields
});


  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = () => {
    setLoading(true);
    fetch("http://localhost:4000/api/contact-lists")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setLists(data.lists);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  // Add contact form handlers (unchanged)
  const handleInputChange = (listId, field, value) => {
    setFormStates((prev) => ({
      ...prev,
      [listId]: {
        ...prev[listId],
        [field]: value,
        error: null,
        success: null,
        submitting: false,
      },
    }));
  };

  const handleAddContact = async (listId) => {
    const form = formStates[listId] || {};
    const { email, name, phone } = form;

    if (!email || !email.trim()) {
      setFormStates((prev) => ({
        ...prev,
        [listId]: {
          ...prev[listId],
          error: "Email is required",
          success: null,
        },
      }));
      return;
    }

    setFormStates((prev) => ({
      ...prev,
      [listId]: { ...prev[listId], submitting: true, error: null, success: null },
    }));

    try {
      const response = await fetch(`http://localhost:4000/api/contact-lists/${listId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to add contact");
      }

      setFormStates((prev) => ({
        ...prev,
        [listId]: { email: "", name: "", phone: "", error: null, success: "Contact added!", submitting: false },
      }));

      fetchLists();
    } catch (err) {
      setFormStates((prev) => ({
        ...prev,
        [listId]: { ...prev[listId], error: err.message, success: null, submitting: false },
      }));
    }
  };

  // Delete contact handler
  const handleDeleteContact = async (listId, contactId) => {
    const confirmed = window.confirm("Are you sure you want to delete this contact?");
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:4000/api/contact-lists/${listId}/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete contact");
      }
      fetchLists();
    } catch (err) {
      alert(err.message);
    }
  };

  // Excel upload input change
  const handleExcelChange = (e) => {
    setUploadError(null);
    setUploadSuccess(null);
    setExcelColumns([]);
    setExcelData([]);
    setUploadListName("");

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // array of arrays

      if (jsonData.length === 0) {
        setUploadError("Excel file is empty.");
        return;
      }

      // First row is columns headers
      const headers = jsonData[0].map((col) => col.toString());

      // Setup columns state for UI with checkboxes and mapping dropdowns
      const columns = headers.map((name) => ({
        name,
        checked: true,
        mapping: "email", // default, user can change later
      }));

      setExcelColumns(columns);

      // Store rest rows for upload
      setExcelData(jsonData.slice(1));
      // Set default list name as filename without extension
      setUploadListName(file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle checkbox toggle for column inclusion
  const toggleColumnChecked = (index) => {
    setExcelColumns((cols) => {
      const newCols = [...cols];
      newCols[index].checked = !newCols[index].checked;
      return newCols;
    });
  };

  // Handle dropdown change for column mapping
  const handleMappingChange = (index, value) => {
    setExcelColumns((cols) => {
      const newCols = [...cols];
      newCols[index].mapping = value;
      return newCols;
    });
  };

  // Submit new list with contacts from Excel data
 const handleUploadSubmit = async () => {
  setUploadError(null);
  setUploadSuccess(null);

  if (!uploadListName.trim()) {
    setUploadError("Please enter a name for the new contact list.");
    return;
  }

  const includedColumns = excelColumns.filter((c) => c.checked);
  if (includedColumns.length === 0) {
    setUploadError("Please select at least one column to include.");
    return;
  }

  const emailColumn = includedColumns.find((c) => c.mapping === "email");
  if (!emailColumn) {
    setUploadError("You must include and map at least one column as Email.");
    return;
  }

  setUploadLoading(true);

  try {
    const contacts = excelData.map((row) => {
      const contact = {};
      let firstName = "";
      let lastName = "";

      includedColumns.forEach((col) => {
        const cellValue = (row[col.name] || "").toString().trim();

        switch (col.mapping) {
          case "email":
            contact.email = cellValue;
            break;
          case "phone":
            contact.phone = cellValue;
            break;
          case "firstName":
            firstName = cellValue;
            break;
          case "lastName":
            lastName = cellValue;
            break;
          default:
            break;
        }
      });

      if (firstName || lastName) {
        contact.name = [firstName, lastName].filter(Boolean).join(" ");
      }

      return contact;
    });

    const filteredContacts = contacts.filter((c) => c.email && c.email.length > 0);

    if (filteredContacts.length === 0) {
      throw new Error("No valid contacts with email found in the uploaded file.");
    }

    const res = await fetch("http://localhost:4000/api/contact-lists/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: uploadListName.trim(),
        contacts: filteredContacts,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to create contact list.");
    }

    setUploadSuccess("Contact list created successfully!");
    setExcelColumns([]);
    setExcelData([]);
    setUploadListName("");
    setExcelFile(null);
    fetchLists();
  } catch (err) {
    setUploadError(err.message);
  } finally {
    setUploadLoading(false);
  }
};


  const handleExcelUpload = async (e) => {
  e.preventDefault();

  if (!excelFile || !listName || !columnMapping.email) {
    alert("Please select a file, enter a list name, and map at least the email column.");
    return;
  }

  const formData = new FormData();
  formData.append("file", excelFile);
  formData.append("name", listName);
  formData.append("description", listDescription || ""); // Optional
  formData.append("columnMapping", JSON.stringify(columnMapping)); // Should be an object like { email: "Email", name: "Full Name", phone: "Phone" }

  try {
    const res = await fetch("http://localhost:4000/api/contact-lists/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${text}`);
    }

    const data = await res.json();
    alert("List created successfully!");
    setExcelFile(null);
    setListName("");
    setListDescription("");
    setColumnMapping({}); // Reset column mappings
    fetchLists(); // Refresh UI
  } catch (err) {
    console.error("Upload error:", err);
    alert("Failed to upload Excel: " + err.message);
  }
};



  if (loading) return <p>Loading contact lists...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Contact Lists</h1>

      {/* Upload Excel Form */}
      <section style={uploadSectionStyle}>
  <h2>Create New List by Uploading Excel</h2>
  <input
    type="file"
    accept=".xls,.xlsx"
    onChange={handleExcelChange}
    disabled={uploadLoading}
  />

  {excelColumns.length > 0 && (
    <div style={{ marginTop: 16 }}>
      <label>
        List Name:{" "}
        <input
          type="text"
          value={uploadListName}
          onChange={(e) => setUploadListName(e.target.value)}
          disabled={uploadLoading}
          style={inputStyle}
          required
        />
      </label>

      <div
        style={{
          marginTop: 12,
          maxHeight: 200,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: 10,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Include</th>
              <th style={thStyle}>Column Name</th>
              <th style={thStyle}>Map as</th>
            </tr>
          </thead>
          <tbody>
            {excelColumns.map((col, i) => (
              <tr key={col.name}>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={col.checked}
                    onChange={() => toggleColumnChecked(i)}
                    disabled={uploadLoading}
                  />
                </td>
                <td>{col.name}</td>
                <td>
                  {col.checked ? (
                    <select
                      value={col.mapping}
                      onChange={(e) => handleMappingChange(i, e.target.value)}
                      disabled={uploadLoading}
                      style={inputStyle}
                      required
                    >
                      <option value="">-- Select --</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="firstName">First Name</option>
                      <option value="lastName">Last Name</option>
                    </select>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {uploadError && <p style={{ color: "red" }}>{uploadError}</p>}
      {uploadSuccess && <p style={{ color: "green" }}>{uploadSuccess}</p>}

      <button onClick={handleUploadSubmit} disabled={uploadLoading}>

        {uploadLoading ? "Uploading..." : "Create Contact List"}
      </button>
    </div>
  )}
</section>


  {/* Existing Lists */}
  {lists.map((list) => {
    const form = formStates[list.id] || {};
    return (
      <section key={list.id} style={sectionStyle}>
        <h2>{list.name}</h2>
        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="Email"
            value={form.email || ""}
            onChange={(e) => handleInputChange(list.id, "email", e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Name"
            value={form.name || ""}
            onChange={(e) => handleInputChange(list.id, "name", e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Phone"
            value={form.phone || ""}
            onChange={(e) => handleInputChange(list.id, "phone", e.target.value)}
            style={inputStyle}
          />
          <button onClick={() => handleAddContact(list.id)} disabled={form.submitting}>
            Add Contact
          </button>
        </div>
        {form.error && <p style={{ color: "red" }}>{form.error}</p>}
        {form.success && <p style={{ color: "green" }}>{form.success}</p>}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.contacts.map((contact) => (
              <tr key={contact.id}>
                <td style={tdStyle}>{contact.email}</td>
                <td style={tdStyle}>{contact.name}</td>
                <td style={tdStyle}>{contact.phone}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleDeleteContact(list.id, contact.id)} style={deleteBtnStyle}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {list.contacts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  No contacts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    );
  })}
</div>
);
}

// Simple inline styles for demo, customize as needed
const containerStyle = {
maxWidth: 900,
margin: "auto",
padding: 20,
fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const headerStyle = { textAlign: "center" };

const sectionStyle = {
border: "1px solid #ddd",
borderRadius: 6,
padding: 16,
marginTop: 20,
};

const uploadSectionStyle = {
...sectionStyle,
backgroundColor: "#f9f9f9",
};

const inputStyle = {
padding: 8,
marginRight: 8,
borderRadius: 4,
border: "1px solid #ccc",
minWidth: 150,
};

const thStyle = {
borderBottom: "1px solid #ccc",
textAlign: "left",
padding: 8,
};

const tdStyle = {
borderBottom: "1px solid #eee",
padding: 8,
};

const deleteBtnStyle = {
backgroundColor: "#e74c3c",
color: "white",
border: "none",
borderRadius: 4,
padding: "4px 8px",
cursor: "pointer",
};