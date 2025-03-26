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

  useEffect(() => {
    setLoading(true);
    dispatch(listUsers()).finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    const newSocket = io("https://connectnow-api-26march.onrender.com", {
      transports: ["websocket"],
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
        console.log("Local stream initialized:", stream.getTracks());
      } catch (error) {
        console.error("Error accessing media devices:", error);
        toast.error("Error accessing media devices.");
      }
    };
    initLocalStream();
  }, []);

  useEffect(() => {
    if (!socket || !userInfo) return;

    const handleVideoOffer = async ({ offer, caller, userToCall }) => {
      if (userToCall !== userInfo.name) return;
      setIncomingCall(true);
      setIncomingCallUser(caller);
      setOffer(offer);
      setCallStatus(`Incoming call from ${caller}`);
      toast.info(`Incoming call from ${caller}`);
    };

    const handleVideoAnswer = async ({ answer, caller }) => {
      if (peerConnection && caller === userInfo.name) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus(`In call with ${incomingCallUser || "remote user"}`);
          console.log("Remote description set for answer:", answer.sdp.includes("m=audio"));
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      }
    };

    const handleNewIceCandidate = async ({ candidate, from, to }) => {
      if (to !== userInfo.name) return;
      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("ICE candidate added from:", from);
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    };

    const handleCallEnded = ({ to }) => {
      if (to === userInfo.name) {
        handleCallEnd();
        toast.info("Call ended by remote user.");
      }
    };

    const handleUserDisconnected = ({ user }) => {
      handleCallEnd();
      toast.info(`${user} disconnected`);
    };

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleFile = (file) => {
      setFile(file);
    };

    socket.on("videoOffer", handleVideoOffer);
    socket.on("videoAnswer", handleVideoAnswer);
    socket.on("newIceCandidate", handleNewIceCandidate);
    socket.on("callEnded", handleCallEnded);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("message", handleMessage);
    socket.on("file", handleFile);

    return () => {
      socket.off("videoOffer");
      socket.off("videoAnswer");
      socket.off("newIceCandidate");
      socket.off("callEnded");
      socket.off("user-disconnected");
      socket.off("message");
      socket.off("file");
    };
  }, [socket, peerConnection, userInfo, incomingCallUser]);

  const createPeerConnection = (remoteUser) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("newIceCandidate", { candidate: event.candidate, to: remoteUser });
        console.log("Sent ICE candidate to:", remoteUser);
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind, "enabled:", event.track.enabled);
      event.track.enabled = true;
      if (!remoteStream.getTracks().find((t) => t.id === event.track.id)) {
        remoteStream.addTrack(event.track);
        setRemoteStream(new MediaStream(remoteStream.getTracks())); // Trigger update
        console.log("Updated remote stream tracks:", remoteStream.getTracks());
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        handleCallEnd();
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.enabled = true;
        pc.addTrack(track, localStream);
        console.log("Added track to peer connection:", track.kind, "enabled:", track.enabled);
      });
    }

    return pc;
  };

  const handleCallUser = async (userToCall) => {
    const pc = createPeerConnection(userToCall);
    setPeerConnection(pc);
    setCallStatus(`Calling ${userToCall}...`);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      socket.emit("videoOffer", { offer, caller: userInfo.name, userToCall });
      console.log("Offer sent to:", userToCall, "with audio:", offer.sdp.includes("m=audio"));
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Failed to initiate call.");
    }
  };

  const handleAcceptCall = async () => {
    const pc = createPeerConnection(incomingCallUser);
    setPeerConnection(pc);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("videoAnswer", { answer, caller: incomingCallUser });
      setCallStatus(`In call with ${incomingCallUser}`);
      setIncomingCall(false);
      console.log("Answer sent to:", incomingCallUser, "with audio:", answer.sdp.includes("m=audio"));
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Failed to accept call.");
    }
  };

  const handleRejectCall = () => {
    socket.emit("rejectCall", { caller: incomingCallUser });
    setIncomingCall(false);
    setCallStatus("");
  };

  const handleCallEnd = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    socket.emit("endCall", { to: incomingCallUser || callStatus.split(" ")[2] });
    setCallStatus("");
    setRemoteStream(new MediaStream());
    setIncomingCall(false);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const msg = { user: userInfo.name, text: message };
      socket.emit("message", { message: msg });
      setMessages((prev) => [...prev, msg]);
      setMessage("");
    }
  };

  const handleFileUpload = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("file", { fileName: file.name, fileContent: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) &&
      user?.name !== userInfo?.name
  );

  return (
    <ChatContainer>
      <Title>ConnectNow | Seamless Video Chat & Instant Messaging</Title>

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

      <Video localStream={localStream} remoteStream={remoteStream} />

      {peerConnection && <Button onClick={handleCallEnd}>End Call</Button>}

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
          <p key={index}>{`${msg.user}: ${msg.text}`}</p>
        ))}
      </MessagesList>

      <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
      <Button onClick={handleFileUpload}>Send File</Button>

      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
