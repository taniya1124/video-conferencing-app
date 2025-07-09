import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "peerjs";
import { v4 as uuid } from "uuid";

// Connect to backend
const socket = io("http://localhost:5000");

function App() {
  const myVideo = useRef();
  const videoGrid = useRef();
  const myPeer = useRef();
  const userId = uuid();

  const [stream, setStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const playVideo = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play().catch((e) => console.log("Autoplay Error:", e));
    });
    videoGrid.current.append(video);
  };

  useEffect(() => {
    myPeer.current = new Peer(undefined, {
      host: "/",
      port: "5000",
      path: "/peerjs",
    });

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    }).then(currentStream => {
      setStream(currentStream);
      playVideo(myVideo.current, currentStream);

      myPeer.current.on("call", call => {
        call.answer(currentStream);
        const video = document.createElement("video");
        call.on("stream", userVideoStream => {
          playVideo(video, userVideoStream);
        });
      });

      socket.emit("join-room", "room1", userId);

      socket.on("user-connected", userId => {
        const call = myPeer.current.call(userId, currentStream);
        const video = document.createElement("video");
        call.on("stream", userVideoStream => {
          playVideo(video, userVideoStream);
        });
      });
    });

    // 🔄 Listen for incoming chat messages
    socket.on("receive-message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });
  }, []);

  // 📤 Send chat message
  const sendMessage = () => {
    if (newMessage.trim() !== "") {
      socket.emit("send-message", newMessage);
      setMessages(prev => [...prev, `You: ${newMessage}`]);
      setNewMessage("");
    }
  };

  // 🔇 Toggle mic
  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  // 🎥 Toggle camera
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🔴 Simple Video Call + Chat</h1>

      <div ref={videoGrid}>
        <video
          ref={myVideo}
          muted
          autoPlay
          style={{ width: "300px", borderRadius: "10px" }}
        />
      </div>

      <div style={{ marginTop: "15px" }}>
        <button onClick={toggleAudio} style={buttonStyle}>
          {audioEnabled ? "🎤 Mute Mic" : "🔇 Unmute Mic"}
        </button>
        <button onClick={toggleVideo} style={{ ...buttonStyle, marginLeft: "10px" }}>
          {videoEnabled ? "📷 Turn Off Camera" : "🎥 Turn On Camera"}
        </button>
      </div>

      <div style={chatBoxStyle}>
        <div style={chatLogStyle}>
          {messages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "10px" }}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            style={inputStyle}
            placeholder="Type a message..."
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} style={sendBtnStyle}>Send</button>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "10px 20px",
  borderRadius: "8px",
  border: "none",
  background: "#007bff",
  color: "#fff",
  cursor: "pointer",
  fontSize: "16px",
};

const chatBoxStyle = {
  marginTop: "30px",
  maxWidth: "400px",
  background: "#f2f2f2",
  padding: "10px",
  borderRadius: "10px",
};

const chatLogStyle = {
  maxHeight: "150px",
  overflowY: "auto",
  background: "#fff",
  padding: "10px",
  borderRadius: "5px",
};

const inputStyle = {
  flex: 1,
  padding: "8px",
  fontSize: "16px",
  borderRadius: "5px",
  border: "1px solid #ccc",
};

const sendBtnStyle = {
  marginLeft: "10px",
  padding: "8px 16px",
  fontSize: "16px",
  background: "#28a745",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

export default App;
