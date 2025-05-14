import { useState } from 'react';
import axios from 'axios';
import EmailUploader from './EmailUploader';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // default theme

export default function EmailSender() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(''); // For ReactQuill editor
  const [htmlContent, setHtmlContent] = useState(''); // For raw HTML input
  const [emailList, setEmailList] = useState('');
  const [emails, setEmails] = useState([]);
  const [status, setStatus] = useState('');

  const handleExtractedEmails = (emailList) => {
    setEmails(emailList);
    setEmailList(emailList.join(', ')); // Use commas
  };

  const handleSend = async () => {
    const recipients = emailList.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

    try {
      await axios.post('http://localhost:4000/send-emails', {
        subject,
        message: htmlContent || message, // Send raw HTML if provided, otherwise the ReactQuill content
        recipients
      });
      setStatus('✅ Emails sent successfully!');
    } catch (error) {
      console.error(error);
      setStatus('❌ Failed to send emails.');
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Email Sender</h1>
      <EmailUploader onEmailsExtracted={handleExtractedEmails} />

      <input
        placeholder="Subject"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />

      <ReactQuill
        value={message}
        
        onChange={setMessage}
        theme="snow"
        style={{ height: 200, marginBottom: 20 }}
      />

      {/* New Textarea for HTML Content */}
      <textarea
        placeholder="Enter HTML content (raw HTML)"
        value={htmlContent}
        onChange={e => setHtmlContent(e.target.value)}
        rows={4}
        style={{ width: '100%', padding: 8, marginBottom: 10, marginTop: 30 }}
      />

      <textarea
        placeholder="Enter emails (one per line or comma separated)"
        value={emailList}
        onChange={e => setEmailList(e.target.value)}
        rows={4}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />

      {emails.length > 0 && (
        <>
          <h3>Extracted Emails</h3>
          <ul>
            {emails.map((e, i) => (
              <li key={i}>{e}{i < emails.length - 1 ? ',' : ''}</li>
            ))}
          </ul>
        </>
      )}

      <button onClick={handleSend}>Send Emails</button>
      <p>{status}</p>
    </div>
  );
}
