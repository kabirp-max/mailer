import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./styles/CampaignsPage.css";

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Failed to load campaigns", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this campaign?");
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:4000/api/campaigns/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert("Campaign deleted");
        fetchCampaigns(); // Refresh after delete
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert("Something went wrong while deleting.");
    }
  };

  return (
    <div className="campaigns-page">
      <div className="campaigns-header">
        <h2>Campaigns</h2>
        <button className="add-btn" onClick={() => navigate("/campaign-creator")}>
          + Add Campaign
        </button>
      </div>

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
                <th>Created At</th>
                <th>Actions</th>
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
                  <td>{new Date(campaign.created_at).toLocaleString()}</td>
                  <td>
                    <button className="danger small" onClick={() => handleDelete(campaign.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Campaigns;
