import { useState } from 'react';
import axios from 'axios';
import EmailUploader from './EmailUploader';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './EmailSender.css';
import TemplatesPage from './TemplatesPage';
import EmailBuilder from './MailBuilder';

export default function EmailSender() {
  const [editedHtml, setEditedHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [emailList, setEmailList] = useState('');
  const [emails, setEmails] = useState([]);
  const [status, setStatus] = useState('');
  const [selectedHtml, setSelectedHtml] = useState('');

  const handleExtractedEmails = (emailList) => {
    setEmails(emailList);
    setEmailList(emailList.join(', '));
  };

  const generatePersonalizedHtml = (html, recipient, subject) => {
  const sentTime = new Date().toISOString();
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return html
    .replace(/{{email}}/g, recipient)
    .replace(/{{subject}}/g, subject)
    .replace(/{{sentTime}}/g, sentTime)
    .replace(/{{someId}}/g, uniqueId);
};

 const handleSend = async () => {
  const recipients = emailList.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

  try {
    const responses = await Promise.all(
      recipients.map(async (recipient) => {
        const htmlToUse = editedHtml || htmlContent || message;
        const personalizedHtml = generatePersonalizedHtml(htmlToUse, recipient, subject);

        return axios.post('http://localhost:4000/send-emails', {
          subject,
          message: personalizedHtml,
          recipients: [recipient],
        });
      })
    );

    setStatus(`✅ Emails sent to ${recipients.length} recipients successfully!`);
  } catch (error) {
    console.error(error);
    setStatus('❌ Failed to send emails.');
  }
};

  return (
    <div className="email-sender">
      <h1 className="title">📧 Email Sender</h1>

      {/* === TEMPLATE SECTION === */}
      <div style={{ marginBottom: '30px' }}>
        {!selectedHtml ? (
          <TemplatesPage onSelectTemplate={setSelectedHtml} />
        ) : (
          <div>
            <EmailBuilder
              initialHtml={selectedHtml}
              onClose={() => setSelectedHtml('')}
              onHtmlChange={setEditedHtml}
            />
          </div>
        )}
      </div>

      {/* === EMAIL FORM SECTION (Always Visible) === */}
      <div className="form-section">
        <EmailUploader onEmailsExtracted={handleExtractedEmails} />
        <br />

        <input
          className="input"
          placeholder="Subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />

        <label className="label">Email Body (Visual Editor)</label>
        <ReactQuill
          value={message}
          onChange={setMessage}
          theme="snow"
          className="quill-editor"
        />

        <label className="label">Optional: Paste Raw HTML</label>
        <textarea
          className="textarea"
          placeholder="Enter HTML content (raw HTML)"
          value={htmlContent}
          onChange={e => setHtmlContent(e.target.value)}
        />

        <label className="label">Recipient Emails</label>
        <textarea
          className="textarea"
          placeholder="Enter emails (comma or line separated)"
          value={emailList}
          onChange={e => setEmailList(e.target.value)}
        />

        {emails.length > 0 && (
          <div className="email-list">
            <h3>📍 Extracted Emails</h3>
            <div className="email-chips">
              {emails.map((e, i) => (
                <span key={i} className="chip">{e}</span>
              ))}
            </div>
          </div>
        )}

        <button className="send-btn" onClick={handleSend}>🚀 Send Emails</button>
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
