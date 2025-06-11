import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './styles/CampaignView.css';

export default function CampaignView() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [lists, setLists] = useState([]);
  const [message, setMessage] = useState('');
  const [publicLink, setPublicLink] = useState('');
  const [stats, setStats] = useState({
    opens: 0,
    clicks: 0,
    unsubscribes: 0,
    openDetails: [],
    clickDetails: [],
    unsubscribeDetails: [],
  });

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

      const publicUrl = `http://localhost:4000/api/htmlPages/${data.id}`;
      setPublicLink(publicUrl);
      setMessage('✅ Link generated successfully!');
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const fetchCampaignStats = async (campaignId) => {
    try {
      const [opensRes, clicksRes, unsubRes] = await Promise.all([
        fetch('http://localhost:4000/api/email-opens'),
        fetch('http://localhost:4000/api/email-clicks'),
        fetch('http://localhost:4000/api/email-unsubscribes'),
      ]);


      if (!opensRes.ok || !clicksRes.ok || !unsubRes.ok) {
        console.log(opensRes);
        
        throw new Error('One or more tracking endpoints returned an error');
      }

      const opensData = await opensRes.json();
      const clicksData = await clicksRes.json();
      const unsubData = await unsubRes.json();

      
      
      const opensCampaign = opensData.campaigns.find(c => c.campaign_id === campaignId);
      const clicksCampaign = clicksData.campaigns.find(c => c.campaign_id === campaignId);
      const unsubCampaign = unsubData.campaigns.find(c => c.campaign_id === campaignId);
      
      console.log(opensCampaign);
      setStats({
        opens: opensCampaign?.opens?.length || 0,
        clicks: clicksCampaign?.clicks?.length || 0,
        unsubscribes: unsubCampaign?.unsubscribes?.length || 0,
        openDetails: opensCampaign?.opens || [],
        clickDetails: clicksCampaign?.clicks || [],
        unsubscribeDetails: unsubCampaign?.unsubscribes || [],
      });
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
    }
  };

  useEffect(() => {
    async function fetchCampaignAndLists() {
      try {
        const campaignRes = await fetch(`http://localhost:4000/api/campaigns/${id}`);
        const campaignData = await campaignRes.json();
        setCampaign(campaignData.campaign);

        const listRes = await fetch('http://localhost:4000/api/contact-lists');
        const listData = await listRes.json();
        setLists(listData.lists || []);

        fetchCampaignStats(campaignData.campaign.id);
      } catch (err) {
        console.error('Failed to fetch campaign/lists:', err);
      }
    }

    fetchCampaignAndLists();
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

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Send Option:</label>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <label>
            <input
              type="radio"
              name="sendOption"
              checked={!campaign.sending_time}
              onChange={() => handleChange('sending_time', null)}
            />{' '}
            Send Now
          </label>

          <label>
            <input
              type="radio"
              name="sendOption"
              checked={!!campaign.sending_time}
              onChange={() =>
                handleChange('sending_time', new Date().toISOString().slice(0, 16))
              }
            />{' '}
            Schedule
          </label>
        </div>

        {campaign.sending_time && (
          <div style={{ marginTop: '0.5rem' }}>
            <input
              type="datetime-local"
              className="input-field"
              value={campaign.sending_time.slice(0, 16)}
              onChange={(e) => handleChange('sending_time', e.target.value)}
            />
          </div>
        )}
      </div>

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

      {/* 
      
      
      
      */}

      <div className="button-group">
        <button className="btn primary" onClick={saveCampaign}>Save</button>
        {!campaign.sending_time && (
          <button
            className="btn secondary"
            onClick={sendCampaign}
            disabled={campaign.status === 'sent'}
            title={campaign.status === 'sent' ? 'Campaign already sent' : ''}
          >
            {campaign.status === 'sent' ? 'Sent' : 'Send'}
          </button>
        )}
        <button className="btn secondary" onClick={generatePublicLink}>
          Generate Public Link
        </button>
      </div>

      {message && <p className="status-message">{message}</p>}

      {publicLink && (
        <p className="public-link">
          🌐 Public Link:{' '}
          <a href={publicLink} target="_blank" rel="noopener noreferrer">
            {publicLink}
          </a>
        </p>
      )}

      {/* 📊 Display Email Stats */}
      <div className="stats-section">
        <h3>📈 Campaign Stats</h3>
        <ul>
          <li><strong>Opens:</strong> {stats.opens}</li>
          <li><strong>Clicks:</strong> {stats.clicks}</li>
          <li><strong>Unsubscribes:</strong> {stats.unsubscribes}</li>
        </ul>
      </div>
    </div>
  );
}