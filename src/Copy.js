import React, { useEffect, useState } from 'react';
import './styles/CampaignCreator.css';

export default function CampaignCreator() {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('');
  const [sendingTime, setSendingTime] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedLists, setSelectedLists] = useState([]);
  const [lists, setLists] = useState([]);
  const [templateFiles, setTemplateFiles] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load contact lists
    fetch('http://localhost:4000/api/contact-lists')
      .then((res) => res.json())
      .then((data) => setLists(data.lists || []));

    // Load template filenames
    fetch('http://localhost:4000/api/templates')
      .then((res) => res.json())
      .then((files) => setTemplateFiles(files || []));
      
  }, []);

  const handleListChange = (e) => {
    const options = Array.from(e.target.selectedOptions).map((opt) =>
      parseInt(opt.value)
    );
    setSelectedLists(options);
  };

const loadTemplate = async (filename) => {
  try {
    const res = await fetch(`http://localhost:4000/templates/${filename}`);
    let html = await res.text();

    // Wrap content in a scaling div
    html = `

      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              transform: scale(0.75);
              transform-origin: top left;
              width: 133.33%;
              height: 133.33%;
              overflow: hidden;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;


    setHtmlContent(html);
  } catch (err) {
    alert('Failed to load template');
  }
};


  const handleSubmit = async (send = false) => {
    setMessage('');
    try {
      const res = await fetch('http://localhost:4000/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          sender_name,
          html_content,
          sending_time,
          list_ids: selectedLists,
          send_now: send,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save campaign');
      setMessage(send ? '✅ Campaign sent!' : '✅ Campaign saved successfully.');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const previewHtml = () => {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    newWindow.TrustedHTML = `
        <html>
            <head>
                <title>Trusted HTML Page</title>
            </head>
            <h1>Hello</h1>
            <p>This is jus a list of items :- </p>
            <ul>
                <li>List Item 1</li>
                <li>List Item 2</li>
                <li>List Item 3</li>
            </ul>
        </html>
    `
  };

  const loadRes = () => {
    return (
      `
      <html>
        <h1>Heading 1</h1>
        <p>abstract content</p>
        <p>List of items -</p>
        <ul>
        <li>Item One</li>
        <li>Item Two</li>
        <li>Item Three </li>
        </ul>
        <button>Download Now</button>
      </html>
      `
    )
  }

  

  return (
    <div className="campaign-creator">
      <h2>Create Campaign</h2>

      <input
        className="input-field"
        placeholder="Campaign Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="input-field"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      <input
        className="input-field"
        placeholder="Sender Name"
        value={senderName}
        onChange={(e) => setSenderName(e.target.value)}
      />

      <label>Send At:</label>
      <input
        type="datetime-local"
        className="input-field"
        value={sendingTime}
        onChange={(e) => setSendingTime(e.target.value)}
      />

      <label>Select Lists:</label>
      <select
        className="multi-select"
        multiple
        value={selectedLists}
        onChange={handleListChange}
      >
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>

      <select
        className='mulit-select'
        multiple
        value={selectedLists}
        onChange={handleListChange}
      >
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>

      <h4>Choose a Template:</h4>
      <div className="template-list">
        {templateFiles.map((file) => (
          <button
            key={file}
            className="template-btn"
            onClick={() => loadTemplate(file)}
          >
            {file}
          </button>
        ))}
      </div>

      {/* <textarea
        className="textarea"
        rows={10}
        value={htmlContent}
        onChange={(e) => setHtmlContent(e.target.value)}
      /> */}
      <label>HTML Content:</label>
{/* Hide textarea and show preview instead */}
{/* <textarea
  className="textarea"
  rows={10}
  value={htmlContent}
  onChange={(e) => setHtmlContent(e.target.value)}
/> */}

<div className="html-preview-frame">
  {htmlContent ? (
    <iframe
      title="HTML Preview"
      className="html-iframe"
      srcDoc={htmlContent}
    />
  ) : (
    <p className="placeholder">Select a template to preview it here.</p>
  )}
</div>


      <button className="btn preview" onClick={previewHtml}>
        Preview
      </button>

      <div className="button-group">
        <button className="btn primary" onClick={() => handleSubmit(false)}>
          Save
        </button>
        {/* <button className="btn secondary" onClick={() => handleSubmit(true)}>
          Send
        </button> */}
      </div>

      {message && <p className="status-message">{message}</p>}
    </div>
  );
}

/**
 * 

a tylr - mrge, grade, maid, ex

 */