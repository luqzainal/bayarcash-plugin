import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Settings from './pages/Settings';
import PaymentIframe from './pages/PaymentIframe';
import InstallFailed from './pages/InstallFailed';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/payment-iframe" element={<PaymentIframe />} />
                <Route path="/install-failed" element={<InstallFailed />} />
            </Routes>
        </Router>
    );
}

export default App;
