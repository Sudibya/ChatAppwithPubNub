import React, { useState, useEffect } from 'react';
import { usePubNub } from 'pubnub-react';

function ClientChat({ username }) {
  const pubnub = usePubNub();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const channel = `${username}-channel`; // Unique channel for each client

  useEffect(() => {
    pubnub.subscribe({ channels: [channel] });

    const handleMessage = (event) => {
      if (event.channel === channel) {
        setMessages((prevMessages) => [...prevMessages, event.message]);
      }
    };

    pubnub.addListener({ message: handleMessage });

    return () => {
      pubnub.unsubscribe({ channels: [channel] });
    };
  }, [pubnub, channel]);

  const sendMessage = () => {
    if (message.trim() === '') return;
    pubnub.publish({ channel, message });
    setMessage('');
  };

  return (
    <div>
      <h2>{`Chat with Admin as ${username}`}</h2>
      <div>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default ClientChat;
