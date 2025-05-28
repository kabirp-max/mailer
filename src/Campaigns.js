import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CampaignsPage.css";

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        console.log(data.campaigns);
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load campaigns", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="campaigns-page">
      <h2>Campaigns</h2>
      {loading ? (
        <p className="loading">Loading...</p>
      ) : campaigns.length === 0 ? (
        <p className="no-data">No campaigns found.</p>
      ) : (
        <div className="table-container">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Status</th>
                {/* <th>Sender</th>
                <th>Lists</th>
                <th>Sending Time</th>
                <th>Opens</th>
                <th>Delivered</th>
                <th>Bounces</th> */}
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <Link to={`/campaigns/${campaign.id}`} className="campaign-link">
                      {campaign.name}
                    </Link>
                  </td>
                  <td>{campaign.subject}</td>
                  <td>{campaign.status}</td>
                  {/* <td>{campaign.sender_name}</td>
                  <td>
                    {campaign.lists.map((list) => (
                      <div key={list.id}>{list.name}</div>
                    ))}
                  </td>
                  <td>
                    {campaign.sending_time
                      ? new Date(campaign.sending_time).toLocaleString()
                      : "—"}
                  </td>
                  <td>{campaign.opens}</td>
                  <td>{campaign.delivered}</td>
                  <td>{campaign.bounces}</td> */}
                  <td>{new Date(campaign.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CampaignsPage;
