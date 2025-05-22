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

export default function App() {
  return (
    <Router>
      <nav className="navbar">
        <div className="logo">Prospect Precise</div>
        <div className="nav-links">
          <Link to="/">Email Sender</Link>
          <Link to="/builder">Mail Builder</Link>
          <Link to="/contacts">Contacts</Link>
          <Link to="/opens">Opens</Link>
          <Link to="/bounces">Bounces</Link>
          <Link to="/campaigns">Campaigns</Link>
          <Link to="/campaign-creator">Campaigns Creator</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<EmailSender />} />
        <Route path="/builder" element={<MailBuilder />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/opens" element={<EmailOpens />} />
        <Route path="/bounces" element={<EmailBounces />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaign-creator" element={<CampaignCreator />} />
         <Route path="/campaigns/:id" element={<CampaignView />} />

        <Route path="/unlayer" element={<UnlayerEditor />} />
        <Route path="/mj" element={<MJMLEditor />} />
      </Routes>
    </Router>
  );
}
