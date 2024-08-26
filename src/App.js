import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { PubNubProvider } from 'pubnub-react';
import pubnub from './config/pubnubConfig';
import AdminChat from './components/AdminChat';
import ClientChat from './components/ClientChat';

function App() {
  const clientChannels = ['client1-channel', 'client2-channel', 'client3-channel'];

  return (
    <PubNubProvider client={pubnub}>
      <Router>
        <Routes>
          {/* Routes for Clients */}
          <Route path="/client1" element={<ClientChat username="client1" />} />
          <Route path="/client2" element={<ClientChat username="client2" />} />
          <Route path="/client3" element={<ClientChat username="client3" />} />

          {/* Route for Admin */}
          <Route path="/admin" element={<AdminChat clientChannels={clientChannels} />} />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/client1" />} />
        </Routes>
      </Router>
    </PubNubProvider>
  );
}

export default App;
