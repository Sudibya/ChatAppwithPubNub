import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePubNub } from 'pubnub-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaPlus, FaEllipsisV, FaSmile, FaSearch } from 'react-icons/fa';

function AdminChat({ clientChannels }) {
  const pubnub = usePubNub();
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState('');
  const [selectedClient, setSelectedClient] = useState(clientChannels[0]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [searchMessageTerm, setSearchMessageTerm] = useState('');
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [typingStates, setTypingStates] = useState({});  // Track typing state for each client

  const typingTimeoutRefs = useRef({});  // Refs to manage typing timeouts for each client
  const menuRef = useRef(null);

  const handleMessage = useCallback((event) => {
    const { channel, message } = event;

    setMessages((prevMessages) => {
      const currentMessages = prevMessages[channel] || [];
      const isDuplicate = currentMessages.some((msg) => msg.text === message.text && msg.time === message.time && msg.sender === message.sender);
      if (isDuplicate) return prevMessages;

      const updatedMessages = {
        ...prevMessages,
        [channel]: [...currentMessages, message],
      };

      if (channel !== selectedClient) {
        setUnreadCounts((prevUnread) => ({
          ...prevUnread,
          [channel]: (prevUnread[channel] || 0) + 1,
        }));
      }

      return updatedMessages;
    });
  }, [selectedClient]);

  const handlePresence = useCallback((presenceEvent) => {
    if (presenceEvent.action === 'state-change') {
      const { channel, state } = presenceEvent;
      if (state && state.isTyping !== undefined && state.sender !== 'Admin') {  // Ensure it doesn't track admin's own typing
        setTypingStates((prevTypingStates) => ({
          ...prevTypingStates,
          [channel]: state.isTyping,
        }));

        // Clear the previous timeout if it exists
        if (typingTimeoutRefs.current[channel]) {
          clearTimeout(typingTimeoutRefs.current[channel]);
        }

        // Set a timeout to reset typing state after a delay
        if (state.isTyping) {
          typingTimeoutRefs.current[channel] = setTimeout(() => {
            setTypingStates((prevTypingStates) => ({
              ...prevTypingStates,
              [channel]: false,
            }));
          }, 3000); // 3 seconds timeout
        }
      }
    }
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await pubnub.history({ channel: selectedClient, count: 100 });
        const historicalMessages = response.messages.map((message) => message.entry);
        setMessages((prevMessages) => ({
          ...prevMessages,
          [selectedClient]: historicalMessages,
        }));
      } catch (error) {
        console.error('Error fetching message history:', error);
      }
    };

    fetchHistory();

    pubnub.subscribe({ channels: clientChannels, withPresence: true });
    pubnub.addListener({
      message: handleMessage,
      presence: handlePresence,
    });

    return () => {
      const currentTypingTimeoutRefs = typingTimeoutRefs.current;

      pubnub.removeListener({ message: handleMessage, presence: handlePresence });
      pubnub.unsubscribe({ channels: clientChannels });

      // Clear all timeouts
      Object.values(currentTypingTimeoutRefs).forEach(clearTimeout);
    };
  }, [pubnub, clientChannels, selectedClient, handleMessage, handlePresence]);

  const sendMessage = () => {
    if (message.trim() === '') return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage = { text: message, time: timestamp, sender: 'Admin' };

    pubnub.publish({ channel: selectedClient, message: newMessage });

    setMessages((prevMessages) => ({
      ...prevMessages,
      [selectedClient]: [...(prevMessages[selectedClient] || []), newMessage],
    }));

    setMessage('');

    pubnub.setState({
      channels: [selectedClient],
      state: { isTyping: false },
    });
  };

  const handleTyping = (e) => {
    const text = e.target.value;
    setMessage(text);

    if (text.trim()) {
      pubnub.setState({
        channels: [selectedClient],
        state: { isTyping: true, sender: 'Admin' },  // Include sender to prevent showing admin's own typing
      });
    } else {
      pubnub.setState({
        channels: [selectedClient],
        state: { isTyping: false, sender: 'Admin' },  // Include sender to prevent showing admin's own typing
      });
    }

    // Reset typing status if user stops typing for a while
    if (typingTimeoutRefs.current[selectedClient]) {
      clearTimeout(typingTimeoutRefs.current[selectedClient]);
    }

    typingTimeoutRefs.current[selectedClient] = setTimeout(() => {
      pubnub.setState({
        channels: [selectedClient],
        state: { isTyping: false, sender: 'Admin' },  // Include sender to prevent showing admin's own typing
      });
    }, 3000); // 3 seconds timeout
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMessage = { text: `File: ${file.name}`, time: timestamp, sender: 'Admin', file };

      pubnub.publish({ channel: selectedClient, message: newMessage });

      setMessages((prevMessages) => ({
        ...prevMessages,
        [selectedClient]: [...(prevMessages[selectedClient] || []), newMessage],
      }));
    }
  };

  const getClientName = (channel) => channel.replace('-channel', '');

  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setShowMenu(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredMessages = (messages[selectedClient] || []).filter((msg) =>
    msg.text.toLowerCase().includes(searchMessageTerm.toLowerCase())
  );

  const handleClientSwitch = (channel) => {
    setSelectedClient(channel);
    setUnreadCounts((prevUnread) => ({
      ...prevUnread,
      [channel]: 0,
    }));
  };

  return (
    <div className="container mt-4">
      <h2>Admin Chat</h2>
      <div className="d-flex" style={{ height: '600px' }}>
        <div className="border-end p-3" style={{ width: '25%', overflowY: 'auto' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search or start new chat"
              value={searchMessageTerm}
              onChange={(e) => setSearchMessageTerm(e.target.value)}
            />
            <FaPlus className="ms-2" size={24} />
          </div>
          <ul className="list-group">
            {clientChannels.map((channel) => (
              <li className="list-group-item d-flex justify-content-between align-items-center" key={channel}>
                <button
                  className={`btn ${selectedClient === channel ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleClientSwitch(channel)}
                  style={{ width: '100%' }}
                >
                  {getClientName(channel)}
                  {unreadCounts[channel] > 0 && (
                    <span className="badge bg-danger ms-2">
                      {unreadCounts[channel]}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-grow-1 d-flex flex-column">
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
            <h3>Chat with {getClientName(selectedClient)}</h3>
            <div className="d-flex align-items-center">
              {showSearchBox && (
                <input
                  type="text"
                  className="form-control me-3"
                  placeholder="Search messages"
                  value={searchMessageTerm}
                  onChange={(e) => setSearchMessageTerm(e.target.value)}
                  style={{ width: '300px' }}
                />
              )}
              <FaSearch className="me-3" size={24} onClick={() => setShowSearchBox(!showSearchBox)} style={{ cursor: 'pointer' }} />
              <FaEllipsisV size={24} onClick={() => setShowMenu(!showMenu)} style={{ cursor: 'pointer' }} />
            </div>
            {showMenu && (
              <div ref={menuRef} className="position-absolute bg-white shadow p-2" style={{ right: '20px', top: '60px', zIndex: 1000 }}>
                <button className="dropdown-item">New group</button>
                <button className="dropdown-item">Starred messages</button>
                <button className="dropdown-item">Select messages</button>
                <button className="dropdown-item">Close chat</button>
                <button className="dropdown-item">Mute notifications</button>
                <button className="dropdown-item">Disappearing messages</button>
                <button className="dropdown-item">Clear chat</button>
                <button className="dropdown-item">Delete chat</button>
                <button className="dropdown-item">Report</button>
                <button className="dropdown-item">Block</button>
              </div>
            )}
          </div>
          <div
            className="border p-3 mb-3 flex-grow-1"
            style={{ maxHeight: '400px', overflowY: 'auto' }}
          >
            {filteredMessages.map((msg, index) => (
              <div
                className={`mb-2 d-flex ${msg.sender === 'Admin' ? 'justify-content-end' : 'justify-content-start'}`}
                key={index}
              >
                <div className={`p-2 rounded ${msg.sender === 'Admin' ? 'bg-primary text-white' : 'bg-light text-dark'}`} style={{ maxWidth: '60%' }}>
                  <strong>{msg.sender}:</strong> {msg.text}
                  <br />
                  <small className="text-muted">{msg.time}</small>
                </div>
              </div>
            ))}
            {Object.keys(typingStates).map((channel) => {
              if (typingStates[channel]) {
                return <div key={channel} className="text-muted">{getClientName(channel)} is typing...</div>;
              }
              return null;
            })}
          </div>

          <div className="input-group">
            <input
              type="file"
              id="file-upload"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <FaPlus size={24} style={{ cursor: 'pointer' }} />
            </label>
            <FaSmile className="me-2" size={24} />
            <input
              type="text"
              className="form-control me-2"
              value={message}
              onChange={handleTyping} // Handle typing state
              placeholder="Type your message"
            />
            <button
              className="btn btn-primary"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminChat;
