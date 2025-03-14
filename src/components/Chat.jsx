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
  const [remoteStream, setRemoteStream] = useState(new MediaStream());
  const [peerConnection, setPeerConnection] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [incomingCall, setIncomingCall] = useState(false);
  const [incomingCallUser, setIncomingCallUser] = useState("");
  const [offer, setOffer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const messageRef = useRef();

  const dispatch = useDispatch();
  const userList = useSelector((state) => state.userList);
  const { users = [] } = userList;
  const userLogin = useSelector((state) => state.userLogin);
  const { userInfo } = userLogin;

  // Load the user list
  useEffect(() => {
    setLoading(true);
    dispatch(listUsers()).finally(() => setLoading(false));
  }, [dispatch]);

  // Setup socket connection
  useEffect(() => {
    const newSocket = io("https://connectnow-backend-24july.onrender.com", {
      transports: ["websocket"],
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
      toast.error("WebSocket connection failed! Please try again later.");
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("Disconnected from WebSocket:", reason);
      toast.warn("Connection lost. Reconnecting...");
    });

    return () => {
      newSocket.off("connect");
      newSocket.off("connect_error");
      newSocket.off("disconnect");
      newSocket.close();
    };
  }, [userInfo]);

  // Get local media stream (with echoCancellation, noiseSuppression, autoGainControl)
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        setLocalStream(stream);
        console.log("Local stream set:", stream);
      } catch (error) {
        console.error("Error accessing media devices.", error);
        toast.error("Error accessing media devices.");
      }
    };

    initLocalStream();
  }, []);

  // (Removed extra remote audio element creation to prevent duplicate playback.)

  // Listen for signaling events
  useEffect(() => {
    if (!socket) return;

    const handleVideoOffer = async ({ offer, caller, userToCall }) => {
      console.log("Received video offer:", offer, caller, userToCall);
      toast.info(`Received video offer from ${caller}`);

      if (userToCall === userInfo?.name) {
        setIncomingCall(true);
        setIncomingCallUser(caller);
        setOffer(offer);
        setCallStatus(`Incoming call from ${caller}`);
      }
    };

    const handleVideoAnswer = async ({ answer, caller }) => {
      console.log("Received video answer:", answer);
      toast.info("Received video answer");

      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("Remote description set successfully");
          setCallStatus(`In call with ${incomingCallUser}`);
        } catch (error) {
          console.error("Error setting remote description for answer:", error);
        }
      } else {
        console.warn("No peer connection available to set remote description.");
      }
    };

    const handleNewIceCandidate = async ({ candidate }) => {
      console.log("Received new ICE candidate:", candidate);
      toast.info("Received new ICE candidate");

      if (candidate && peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added ICE candidate successfully");
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      } else {
        console.warn("Peer connection is not ready to add ICE candidate.");
      }
    };

    const handleUserDisconnected = () => {
      console.log("User disconnected");
      toast.info("User disconnected");
      handleCallEnd();
    };

    const handleMessage = (msg) => {
      console.log("Received message:", msg);
      setMessages((prevMessages) => [...prevMessages, msg]);
    };

    const handleFile = (file) => {
      console.log("Received file:", file);
      setFile(file);
    };

    socket.on("videoOffer", handleVideoOffer);
    socket.on("videoAnswer", handleVideoAnswer);
    socket.on("newIceCandidate", handleNewIceCandidate);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("message", handleMessage);
    socket.on("file", handleFile);

    return () => {
      socket.off("videoOffer", handleVideoOffer);
      socket.off("videoAnswer", handleVideoAnswer);
      socket.off("newIceCandidate", handleNewIceCandidate);
      socket.off("user-disconnected", handleUserDisconnected);
      socket.off("message", handleMessage);
      socket.off("file", handleFile);
    };
  }, [socket, peerConnection, userInfo, incomingCallUser]);

  // Create a new RTCPeerConnection and add local tracks
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("newIceCandidate", { candidate: event.candidate });
        console.log("Sent ICE candidate:", event.candidate);
      }
    };

    // Append each incoming track to form a complete remote stream (audio & video)
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      setRemoteStream((prevStream) => {
        const existingTracks = prevStream ? prevStream.getTracks() : [];
        // Avoid duplicate tracks
        if (existingTracks.find((t) => t.id === event.track.id)) {
          return prevStream;
        }
        const newTracks = [...existingTracks, event.track];
        return new MediaStream(newTracks);
      });
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      console.warn("Local stream is not ready when trying to add tracks.");
    }

    return pc;
  };

  // Initiate a call to another user
  const handleCallUser = async (userToCall) => {
    setCallStatus("Calling...");
    const pc = createPeerConnection();
    setPeerConnection(pc);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("videoOffer", {
        offer,
        caller: userInfo.name,
        userToCall,
      });

      setCallStatus(`Calling ${userToCall}...`);
      toast.info(`Calling ${userToCall}...`);
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Error creating offer.");
    }
  };

  // Accept an incoming call
  const handleAcceptCall = async () => {
    // Reuse the existing peer connection if available; otherwise create a new one.
    let pc = peerConnection;
    if (!pc) {
      pc = createPeerConnection();
      setPeerConnection(pc);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("videoAnswer", { answer, caller: incomingCallUser });
      setCallStatus(`In call with ${incomingCallUser}`);
      setIncomingCall(false);
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Error accepting call.");
    }
  };

  const handleRejectCall = () => {
    setIncomingCall(false);
    setCallStatus("");
    setIncomingCallUser("");
  };

  const handleCallEnd = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setCallStatus("");
    setRemoteStream(new MediaStream());
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit("message", message);
      setMessages((prevMessages) => [...prevMessages, message]);
      setMessage("");
    }
  };

  const handleFileUpload = () => {
    if (file) {
      socket.emit("file", file);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) &&
      user?.name !== userInfo?.name
  );

  return (
    <ChatContainer>
      <Title>Chat</Title>

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
                <Button onClick={() => handleCallUser(user.name)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>

      {callStatus && <CallStatus connected={!!peerConnection}>{callStatus}</CallStatus>}

      {incomingCall && (
        <IncomingCall>
          <p>Incoming call from {incomingCallUser}</p>
          <Button onClick={handleAcceptCall}>Accept</Button>
          <Button onClick={handleRejectCall}>Reject</Button>
        </IncomingCall>
      )}

      {/* Render the presentational Video component */}
      <Video localStream={localStream} remoteStream={remoteStream} />

      <MessageContainer>
        <MessageInput
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          ref={messageRef}
        />
        <Button onClick={handleSendMessage}>Send Message</Button>
      </MessageContainer>

      <MessagesList>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </MessagesList>

      <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
      <Button onClick={handleFileUpload}>Send File</Button>

      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
