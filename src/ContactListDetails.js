import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./styles/ContactListDetails.css";

function ContactListDetails() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [selectedList, setSelectedList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    fetchList();
  }, [listId]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/contact-lists");
      const data = await res.json();
      const match = data.lists?.find((l) => String(l.id) === listId);
      setSelectedList(match || null);
    } catch (err) {
      console.error("Failed to fetch contact lists:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this contact list?");
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:4000/api/contact-lists/${listId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      alert(data.message || "Deleted successfully");
      navigate("/contacts"); // Change this if your list page is elsewhere
    } catch (err) {
      console.error("Failed to delete contact list:", err);
      alert("Error deleting list");
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();

    if (!newContact.email) {
      return alert("Email is required");
    }

    try {
      const res = await fetch(`http://localhost:4000/api/contact-lists/${listId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      const result = await res.json();
      if (res.ok) {
        alert("Contact added");
        setNewContact({ name: "", email: "", phone: "" });
        setShowAddForm(false);
        fetchList();
      } else {
        alert(result.error || "Failed to add contact");
      }
    } catch (err) {
      console.error("Error adding contact:", err);
      alert("Error adding contact");
    }
  };

  const handleDeleteContact = async (contactId) => {
  const confirmed = window.confirm("Are you sure you want to delete this contact from the list?");
  if (!confirmed) return;

  try {

    console.log(`http://localhost:4000/api/contact-lists/${listId}/contacts/${contactId}`);

    const res = await fetch(
      `http://localhost:4000/api/contact-lists/${listId}/contacts/${contactId}`,
      { method: "DELETE" }
    );
    const data = await res.json();

    if (res.ok) {
      alert("Contact removed");
      fetchList(); // Refresh list
    } else {
      alert(data.error || "Failed to delete contact");
    }
  } catch (err) {
    console.error("Error deleting contact:", err);
    alert("Error deleting contact");
  }
};


  if (loading) return <p className="contact-details-page">Loading...</p>;
  if (!selectedList) return <p className="contact-details-page">Contact list not found.</p>;

  return (
    <div className="contact-details-page">
      <h2>Contact List: {selectedList.name}</h2>

      <div className="buttons">
        <button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "Add Contact"}
        </button>
        <button onClick={handleDeleteList} className="danger">
          Delete List
        </button>
      </div>

      {showAddForm && (
        <form className="add-contact-form" onSubmit={handleAddContact}>
          <input
            type="text"
            placeholder="Name"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email *"
            required
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
          />
          <input
            type="text"
            placeholder="Phone"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
          />
          <button type="submit">Save Contact</button>
        </form>
      )}

      {selectedList.contacts.length === 0 ? (
        <p>No contacts in this list.</p>
      ) : (
        <table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Phone</th>
      <th>Extra Data</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {selectedList.contacts.map((contact) => (
      <tr key={contact.id}>
        <td>{contact.name || "-"}</td>
        <td>{contact.email || "-"}</td>
        <td>{contact.phone || "-"}</td>
        <td>
          {contact.extra_data && Object.keys(contact.extra_data).length
            ? JSON.stringify(contact.extra_data)
            : "-"}
        </td>
        <td>
          <button
            className="danger small"
            onClick={() => handleDeleteContact(contact.id)}
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

      )}
    </div>
  );
}

export default ContactListDetails;
