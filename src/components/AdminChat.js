import React, { useState, useEffect } from 'react';
import { usePubNub } from 'pubnub-react';

function AdminChat({ clientChannels }) {
  const pubnub = usePubNub();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedClient, setSelectedClient] = useState(clientChannels[0]); // Initially select the first client

  useEffect(() => {
    pubnub.subscribe({ channels: clientChannels });

    const handleMessage = (event) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { channel: event.channel, message: event.message },
      ]);
    };

    pubnub.addListener({ message: handleMessage });

    return () => {
      pubnub.unsubscribe({ channels: clientChannels });
    };
  }, [pubnub, clientChannels]);

  const sendMessage = () => {
    if (message.trim() === '') return;
    pubnub.publish({ channel: selectedClient, message });
    setMessage('');
  };

  const getClientName = (channel) => channel.replace('-channel', '');

  return (
    <div>
      <h2>Admin Chat</h2>
      <div>
        <h3>Select a Client</h3>
        <ul>
          {clientChannels.map((channel) => (
            <li key={channel}>
              <button onClick={() => setSelectedClient(channel)}>
                {getClientName(channel)}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Chat with {getClientName(selectedClient)}</h3>
        <div>
          {messages
            .filter((msg) => msg.channel === selectedClient)
            .map((msg, index) => (
              <p key={index}>
                <strong>{getClientName(msg.channel)}:</strong> {msg.message}
              </p>
            ))}
        </div>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default AdminChat;
