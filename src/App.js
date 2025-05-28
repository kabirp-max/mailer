import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import EmailSender from './pages/EmailSender';
import MailBuilder from './pages/MailBuilder';
import ContactsPage from './ContactsPage';
import EmailOpens from './EmailOpens';
import './Appp.css';
import UnlayerEditor from './pages/UnilayerEditor';
import MJMLEditor from './pages/MJMLEditor';
import EmailBounces from './pages/EmailBounces';
import CampaignsPage from './Campaigns';
import CampaignCreator from './CampaignCreator';
import CampaignView from './CampaignView';
import { useState } from 'react';
import EmailBuilder from './MailEditor';
import ContactListDetails from './ContactListDetails';


export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Router>
      <div className="app-layout">
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <div className="logo">PP</div>
            <button className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
              ☰
            </button>
          </div>
          <nav className="nav-links">
            {/* <Link to="/">📤 Email Sender</Link> */}
            <Link to="/campaigns">📊 Campaigns</Link>
            <Link to="/contacts">👥 Contacts</Link>
            <Link to="/campaign-creator">🛠️ Campaign Creator</Link>
            <Link to="/builder">🧱 Mail Builder</Link>
            <Link to="/edit">🧱 Scratch Mail Builder</Link>
            {/* <Link to="/opens">📬 Opens</Link>
            <Link to="/bounces">📨 Bounces</Link> */}
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<CampaignsPage />} />
            <Route path="/builder" element={<MailBuilder />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/opens" element={<EmailOpens />} />
            <Route path="/bounces" element={<EmailBounces />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaign-creator" element={<CampaignCreator />} />
            <Route path="/campaigns/:id" element={<CampaignView />} />
            <Route path="/unlayer" element={<UnlayerEditor />} />
            <Route path="/mj" element={<MJMLEditor />} />
            <Route path="/edit" element={<EmailBuilder />} />
                    <Route path="/contacts/:listId" element={<ContactListDetails />} />

          </Routes>
        </main>
      </div>
    </Router>
  );
}
