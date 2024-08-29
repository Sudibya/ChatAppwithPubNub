import React, { useState, useEffect, useRef } from "react";
import { usePubNub } from "pubnub-react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaPlus, FaSmile, FaArrowUp, FaEllipsisV } from "react-icons/fa";
import Picker from 'emoji-picker-react';

function ClientChat({ username }) {
  const pubnub = usePubNub();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(null);
  const [isTyping, setIsTyping] = useState(false);  // Track typing state
  const channel = `${username}-channel`;
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null); // Ref to manage typing timeout

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await pubnub.history({ channel, count: 100 });
        const historicalMessages = response.messages.map((message) => message.entry);
        setMessages(historicalMessages);
      } catch (error) {
        console.error('Error fetching message history:', error);
      }
    };

    fetchHistory();

    pubnub.subscribe({ channels: [channel], withPresence: true });

    pubnub.addListener({
      message: (event) => {
        if (event.channel === channel) {
          setMessages((prevMessages) => [...prevMessages, event.message]);
        }
      },
      presence: (presenceEvent) => {
        if (presenceEvent.action === 'state-change') {
          setIsTyping(presenceEvent.state.isTyping);
        }
      }
    });

    return () => {
      pubnub.unsubscribe({ channels: [channel] });
    };
  }, [pubnub, channel]);

  useEffect(() => {
    const handleScroll = () => {
      if (messageEndRef.current) {
        setShowScrollTopButton(messageEndRef.current.scrollTop > 50);
      }
    };

    const scrollContainer = messageEndRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    sendFile(e.target.files[0]);
  };

  const sendFile = (file) => {
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage = {
      text: `File: ${file.name}`,
      time: timestamp,
      sender: username,
      fileUrl: fileUrl,
    };

    pubnub.publish({ channel, message: newMessage });
  };

  const sendMessage = () => {
    if (message.trim() === "") return;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage = { text: message, time: timestamp, sender: username };

    pubnub.publish({ channel, message: newMessage });
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setMessage("");

    pubnub.setState({
      channels: [channel],
      state: { isTyping: false },
    });
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (e.target.value.trim() && !isTyping) {
      pubnub.setState({
        channels: [channel],
        state: { isTyping: true },
      });
    } else if (!e.target.value.trim() && isTyping) {
      pubnub.setState({
        channels: [channel],
        state: { isTyping: false },
      });
    }

    // Reset typing status if user stops typing for a while
    clearTimeout(typingTimeoutRef.current);
    if (e.target.value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        pubnub.setState({
          channels: [channel],
          state: { isTyping: false },
        });
      }, 3000); // 3 seconds timeout
    }
  };

  const onEmojiClick = (event, emojiObject) => {
    setMessage(message + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleScrollTop = () => {
    messageEndRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleOptionsMenu = (index) => {
    setShowOptionsMenu((prevIndex) => (prevIndex === index ? null : index));
  };

  return (
    <div className="d-flex flex-column border rounded" style={{ maxWidth: "400px", height: "600px" }}>
      <h2 className="bg-success text-white text-center py-2">
        {`Chat with Admin as ${username}`}
      </h2>
      <div className="flex-grow-1 p-3 overflow-auto bg-light" ref={messageEndRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`d-flex ${msg.sender === username ? "justify-content-end" : "justify-content-start"} mb-2`}
          >
            <div
              className={`p-2 rounded position-relative ${
                msg.sender === username ? "bg-success text-white" : "bg-white"
              }`}
            >
              {showOptionsMenu === index && (
                <div className="position-absolute bg-white border rounded" style={{ right: 0 }}>
                  <button className="btn btn-light d-block w-100">Pin</button>
                  <button className="btn btn-light d-block w-100">Reply</button>
                  <button className="btn btn-light d-block w-100">Delete</button>
                </div>
              )}
              <p className="mb-1">
                {msg.fileUrl ? (
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                    {msg.text}
                  </a>
                ) : (
                  msg.text
                )}
              </p>
              <small className="text-muted d-flex align-items-center justify-content-between">
                {msg.time}
                <FaEllipsisV style={{ cursor: "pointer" }} onClick={() => toggleOptionsMenu(index)} />
              </small>
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
        {isTyping && <div className="text-muted">Admin is typing...</div>}
      </div>
      {showScrollTopButton && (
        <button className="btn btn-secondary position-absolute" style={{ bottom: "80px", right: "20px" }} onClick={handleScrollTop}>
          <FaArrowUp />
        </button>
      )}
      <div className="input-group p-2 border-top">
        <label className="btn btn-light ms-2">
          <FaPlus />
          <input type="file" onChange={handleFileChange} style={{ display: "none" }} />
        </label>
        <button className="btn btn-light ms-2" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          <FaSmile />
        </button>
        {showEmojiPicker && (
          <div style={{ position: "absolute", bottom: "60px", right: "20px" }}>
            <Picker onEmojiClick={onEmojiClick} />
          </div>
        )}
        <input
          value={message}
          onChange={handleTyping}  // Update on typing
          placeholder="Type your message"
          className="form-control"
        />
        <button onClick={sendMessage} className="btn btn-success ms-2">
          Send
        </button>
      </div>
    </div>
  );
}

export default ClientChat;
