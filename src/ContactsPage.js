import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);

  // Fetch contacts
  useEffect(() => {
    axios.get('http://localhost:4000/contacts')
      .then(response => setContacts(response.data))
      .catch(error => console.error('Error fetching contacts', error));
  }, []);

  // Add contact
  const addContact = () => {
    axios.post('http://localhost:4000/contacts', { name, email })
      .then(response => {
        setContacts([...contacts, { name, email }]);
        setName('');
        setEmail('');
      })
      .catch(error => console.error('Error adding contact', error));
  };

  // Delete contact
  const deleteContact = (id) => {
    axios.delete(`http://localhost:4000/contacts/${id}`)
      .then(response => {
        setContacts(contacts.filter(contact => contact.id !== id));
      })
      .catch(error => console.error('Error deleting contact', error));
  };

  // Edit contact
  const editContact = (id) => {
    const updatedName = prompt('Enter new name');
    const updatedEmail = prompt('Enter new email');
    axios.put(`http://localhost:4000/contacts/${id}`, { name: updatedName, email: updatedEmail })
      .then(response => {
        setContacts(contacts.map(contact => contact.id === id ? { id, name: updatedName, email: updatedEmail } : contact));
      })
      .catch(error => console.error('Error editing contact', error));
  };

  // Handle CSV upload
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = () => {
    const formData = new FormData();
    formData.append('file', file);
    axios.post('http://localhost:4000/contacts/upload-csv', formData)
      .then(response => alert('CSV Uploaded'))
      .catch(error => console.error('Error uploading CSV', error));
  };

  return (
    <div>
      <h1>Contacts</h1>
      
      {/* Add Contact */}
      <input 
        type="text" 
        placeholder="Name" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
      />
      <input 
        type="email" 
        placeholder="Email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
      <button onClick={addContact}>Add Contact</button>

      {/* CSV Upload */}
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload CSV</button>

      <ul>
        {contacts.map(contact => (
          <li key={contact.id}>
            {contact.name} ({contact.email})
            <button onClick={() => editContact(contact.id)}>Edit</button>
            <button onClick={() => deleteContact(contact.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContactsPage;
