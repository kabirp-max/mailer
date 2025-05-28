import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./ContactListDetails.css";

function ContactListDetails() {
  const { listId } = useParams();
  const [selectedList, setSelectedList] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLists = async () => {
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

    fetchLists();
  }, [listId]);

  if (loading) return <p className="contact-details-page">Loading...</p>;
  if (!selectedList) return <p className="contact-details-page">Contact list not found.</p>;

  return (
    <div className="contact-details-page">
      <h2>Contact List: {selectedList.name}</h2>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ContactListDetails;
