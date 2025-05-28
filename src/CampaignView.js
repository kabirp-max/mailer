import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './CampaignView.css';

export default function CampaignView() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [lists, setLists] = useState([]);
  const [message, setMessage] = useState('');
  const [opens, setOpens] = useState([]);
  const [publicLink, setPublicLink] = useState('');

 const generatePublicLink = async () => {
  setMessage('');
  try {
    const res = await fetch('http://localhost:4000/api/public-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        html_content: campaign.html_content,
  name: campaign.name || 'Untitled Template',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate link');

    const publicUrl = `http://localhost:4000/htmlPages/${data.id}`;
    setPublicLink(publicUrl);
    setMessage('✅ Link generated successfully!');
  } catch (err) {
    setMessage(`❌ ${err.message}`);
  }
};



  useEffect(() => {
  async function fetchCampaignAndOpens() {
    try {
      const campaignRes = await fetch(`http://localhost:4000/api/campaigns/${id}`);
      const campaignData = await campaignRes.json();
      setCampaign(campaignData.campaign);

      const listRes = await fetch('http://localhost:4000/api/contact-lists');
      const listData = await listRes.json();
      setLists(listData.lists || []);

      const opensRes = await fetch('https://track.techresearchcenter.com/api/opens');
      const opensData = await opensRes.json();

      // Now safely filter with the known subject
      const matching = opensData.filter(open => open.subject === campaignData.campaign.subject);
      console.log(matching);
      
      const uniqueMatchingEmails = [...new Set(matching.map(open => open.email))];
      console.log(uniqueMatchingEmails);


      setOpens(uniqueMatchingEmails);
      
    } catch (err) {
      console.error('Failed to fetch campaign or opens:', err);
    }
  }

  fetchCampaignAndOpens();
}, [id]);

  useEffect(() => {
    fetch(`http://localhost:4000/api/campaigns/${id}`)
      .then((res) => res.json())
      .then((data) => setCampaign(data.campaign));

    fetch('http://localhost:4000/api/contact-lists')
      .then((res) => res.json())
      .then((data) => setLists(data.lists || []));
  }, [id]);

  const handleChange = (field, value) => {
    setCampaign((prev) => ({ ...prev, [field]: value }));
  };

  const handleListChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((opt) =>
      parseInt(opt.value)
    );
    setCampaign((prev) => ({ ...prev, listIds: selected }));
  };

  const saveCampaign = async () => {
    setMessage('');
    try {
      const res = await fetch(`http://localhost:4000/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update campaign');
      setMessage('✅ Campaign updated successfully');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const sendCampaign = async () => {
    setMessage('');
    try {
      const res = await fetch(
        `http://localhost:4000/api/campaigns/${id}/send`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send campaign');
      setMessage('✅ Campaign sent successfully!');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  if (!campaign) return <div className="loading">Loading campaign...</div>;

  return (
    <div className="campaign-view">
      <h2>Edit Campaign</h2>

      <input
        className="input-field"
        placeholder="Campaign Name"
        value={campaign.name}
        onChange={(e) => handleChange('name', e.target.value)}
      />

      <input
        className="input-field"
        placeholder="Subject"
        value={campaign.subject}
        onChange={(e) => handleChange('subject', e.target.value)}
      />

      <input
        className="input-field"
        placeholder="Sender Name"
        value={campaign.sender_name}
        onChange={(e) => handleChange('sender_name', e.target.value)}
      />

      <label>Send At:</label>
      <input
        type="datetime-local"
        className="input-field"
        value={campaign.sending_time ? campaign.sending_time.slice(0, 16) : ''}
        onChange={(e) => handleChange('sending_time', e.target.value)}
      />

      <label>Select Lists:</label>
      <select
        className="multi-select"
        multiple
        value={campaign.listIds || []}
        onChange={handleListChange}
      >
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>

      <label>HTML Content:</label>
      <textarea
        className="textarea"
        rows={10}
        value={campaign.html_content}
        onChange={(e) => handleChange('html_content', e.target.value)}
      />

      <div className="button-group">
        <button className="btn primary" onClick={saveCampaign}>
          Save
        </button>
        <button className="btn secondary" onClick={sendCampaign}>
          Send
        </button>
        <button className="btn secondary" onClick={generatePublicLink}>
  Generate Public Link
</button>
      </div>

      {message && <p className="status-message">{message}</p>}

       

{publicLink && (
  <p className="public-link">
    🌐 Public Link: <a href={publicLink} target="_blank" rel="noopener noreferrer">{publicLink}</a>
  </p>
)}


      {opens.length > 0 && (
  <div className="opens-section">
    <h3>Email Opens ({opens.length})</h3>
    <table className="opens-table" style={{'display': 'none'}}>
      <thead>
        <tr>
          <th>Email</th>
          <th>Opened At</th>
          <th>IP</th>
        </tr>
      </thead>
      <tbody>
        {opens.map((open, i) => (
          <tr key={i}>
            <td>{open.email}</td>
            <td>{new Date(open.openTime).toLocaleString()}</td>
            <td>{open.ip}</td>
          </tr>
        ))}
      </tbody>
    </table>


  </div>
)}
    </div>
  );
}