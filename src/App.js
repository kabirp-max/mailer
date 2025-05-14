import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import EmailSender from './pages/EmailSender';
import MailBuilder from './pages/MailBuilder';
import ContactsPage from './ContactsPage';
import EmailOpens from './EmailOpens';

export default function App() {
  return (
    <Router>
      <nav style={{ padding: 20, background: '#eee' }}>
        <Link to="/" style={{ marginRight: 20 }}>Email Sender</Link>
        <Link to="/builder">Mail Builder</Link>
        <Link to="/contacts">Contacts</Link>
      </nav>
      <Routes>
        <Route path="/" element={<EmailSender />} />
        <Route path="/builder" element={<MailBuilder />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/opens" element={<EmailOpens />} />
      </Routes>
    </Router>
  );
}
