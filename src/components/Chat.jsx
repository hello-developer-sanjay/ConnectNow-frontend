import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Video from "./Video";
import { useDispatch, useSelector } from "react-redux";
import { listUsers } from "../actions/userActions";
import styled from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";

const ChatContainer = styled.div`
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 1rem;
  align-items: start;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Title = styled.h1`
  grid-column: span 2;
  font-size: 2rem;
  margin-bottom: 1rem;
  text-align: center;
  background: linear-gradient(to right, #007bff, #00ff7f);
  -webkit-background-clip: text;
  color: transparent;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  margin: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background: linear-gradient(to right, #007bff, #00ff7f);
  color: white;
  transition: transform 0.3s ease;
  &:hover {
    background: linear-gradient(to right, #0056b3, #00cc6a);
    transform: scale(1.1);
  }
`;

const UserListContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;
  width: 100%;
`;

const SearchInput = styled.input`
  width: 100%;
  max-width: 300px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const UserList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
`;

const UserItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  transition: transform 0.3s ease;
`;

const CallStatus = styled.p`
  margin: 1rem 0;
  font-size: 1rem;
  color: ${(props) => (props.connected ? "green" : "red")};
  text-align: center;
`;

const IncomingCall = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;
`;

const MessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
`;

const MessageInput = styled.textarea`
  width: 100%;
  max-width: 400px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const MessagesList = styled.div`
  width: 100%;
  max-width: 400px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  margin-bottom: 1rem;
`;

const FileInput = styled.input`
  margin-bottom: 1rem;
`;

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [incomingCall, setIncomingCall] = useState(false);
  const [incomingCaller, setIncomingCaller] = useState("");
  const [offerData, setOfferData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const userList = useSelector((state) => state.userList);
  const { users = [] } = userList;
  const userLogin = useSelector((state) => state.userLogin);
  const { userInfo } = userLogin;

  // Load user list
  useEffect(() => {
    setLoading(true);
    dispatch(listUsers()).finally(() => setLoading(false));
  }, [dispatch]);

  // Setup socket connection
  useEffect(() => {
    const newSocket = io("https://connectnow-backend-24july.onrender.com", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server");
      if (userInfo) {
        newSocket.emit("joinRoom", { room: "commonroom", user: userInfo.name });
      }
    });

    newSocket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
      toast.error("WebSocket connection failed!");
    });

    return () => newSocket.close();
  }, [userInfo]);

  // Get local media stream with advanced audio constraints
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000, // Higher sample rate for better audio quality
          },
        });
        setLocalStream(stream);
      } catch (error) {
        console.error("Error accessing media devices:", error);
        toast.error("Failed to access camera/microphone.");
      }
    };
    initLocalStream();
  }, []);

  // Handle WebRTC signaling
  useEffect(() => {
    if (!socket || !localStream) return;

    const handleVideoOffer = ({ offer, caller, userToCall }) => {
      if (userToCall === userInfo?.name) {
        setIncomingCall(true);
        setIncomingCaller(caller);
        setOfferData(offer);
        setCallStatus(`Incoming call from ${caller}`);
        toast.info(`Incoming call from ${caller}`);
      }
    };

    const handleVideoAnswer = async ({ answer, caller }) => {
      if (peerConnection && peerConnection.signalingState === "have-local-offer") {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus(`Connected with ${caller}`);
        } catch (error) {
          console.error("Error setting remote description:", error);
          toast.error("Failed to connect call.");
        }
      }
    };

    const handleNewIceCandidate = async ({ candidate }) => {
      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    };

    const handleUserDisconnected = ({ user }) => {
      toast.info(`${user} disconnected`);
      endCall();
    };

    socket.on("videoOffer", handleVideoOffer);
    socket.on("videoAnswer", handleVideoAnswer);
    socket.on("newIceCandidate", handleNewIceCandidate);
    socket.on("user-disconnected", handleUserDisconnected);

    return () => {
      socket.off("videoOffer", handleVideoOffer);
      socket.off("videoAnswer", handleVideoAnswer);
      socket.off("newIceCandidate", handleNewIceCandidate);
      socket.off("user-disconnected", handleUserDisconnected);
    };
  }, [socket, peerConnection, localStream, userInfo]);

  // Create RTCPeerConnection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("newIceCandidate", { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const newRemoteStream = new MediaStream();
      event.streams[0].getTracks().forEach((track) => {
        newRemoteStream.addTrack(track);
      });
      setRemoteStream(newRemoteStream);
    };

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected") {
        endCall();
      }
    };

    return pc;
  };

  // Initiate a call
  const startCall = async (userToCall) => {
    const pc = createPeerConnection();
    setPeerConnection(pc);
    setCallStatus(`Calling ${userToCall}...`);

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socket.emit("videoOffer", { offer, caller: userInfo.name, userToCall });
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Failed to initiate call.");
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    const pc = createPeerConnection();
    setPeerConnection(pc);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("videoAnswer", { answer, caller: incomingCaller });
      setCallStatus(`Connected with ${incomingCaller}`);
      setIncomingCall(false);
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Failed to accept call.");
    }
  };

  // End call
  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setRemoteStream(null);
    setCallStatus("");
    setIncomingCall(false);
    setIncomingCaller("");
  };

  // Send message
  const sendMessage = () => {
    if (message.trim()) {
      const msg = { user: userInfo.name, text: message };
      socket.emit("message", msg);
      setMessages((prev) => [...prev, msg]);
      setMessage("");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) &&
      user?.name !== userInfo?.name
  );

  return (
    <ChatContainer>
      <Title>ConnectNow | Seamless Video Chat</Title>

      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading ? (
          <ClipLoader color={"#007bff"} loading={loading} size={50} />
        ) : (
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id}>
                {user.name}
                <Button onClick={() => startCall(user.name)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>

      {callStatus && <CallStatus connected={!!peerConnection}>{callStatus}</CallStatus>}

      {incomingCall && (
        <IncomingCall>
          <p>Incoming call from {incomingCaller}</p>
          <Button onClick={acceptCall}>Accept</Button>
          <Button onClick={endCall}>Reject</Button>
        </IncomingCall>
      )}

      <Video localStream={localStream} remoteStream={remoteStream} />

      <MessageContainer>
        <MessageInput
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button onClick={sendMessage}>Send Message</Button>
      </MessageContainer>

      <MessagesList>
        {messages.map((msg, index) => (
          <p key={index}>{`${msg.user}: ${msg.text}`}</p>
        ))}
      </MessagesList>

      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
