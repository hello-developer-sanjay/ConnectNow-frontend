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
    const newSocket = io("https://connectnow-backend-24july.onrender.com");
    setSocket(newSocket);

    if (userInfo) {
      newSocket.emit("joinRoom", { room: "commonroom", user: userInfo.name });
    }

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
        console.log("Local stream set:", stream);
      } catch (error) {
        console.error("Error accessing media devices.", error);
        toast.error("Error accessing media devices.");
      }
    };

    initLocalStream();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("videoOffer", async ({ offer, caller, userToCall }) => {
        console.log("Received video offer:", offer, caller, userToCall);
        toast.info(`Received video offer from ${caller}`);

        if (userToCall === userInfo?.name) {
          setIncomingCall(true);
          setIncomingCallUser(caller);
          setOffer(offer);
          setCallStatus(`Incoming call from ${caller}`);
        }
      });

      socket.on("videoAnswer", async ({ answer, caller }) => {
        console.log("Received video answer:", answer);
        toast.info("Received video answer");

        if (peerConnection && peerConnection.signalingState === "have-local-offer") {
          try {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(answer)
            );
            console.log("Remote description set successfully");
            setCallStatus(`In call with ${incomingCallUser}`);
          } catch (error) {
            console.error("Error setting remote description for answer:", error);
          }
        } else {
          console.warn("No peer connection or peer connection is not in 'have-local-offer' state");
        }
      });

      socket.on("newIceCandidate", async ({ candidate }) => {
        console.log("Received new ICE candidate:", candidate);
        toast.info("Received new ICE candidate");

        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added ICE candidate successfully");
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      });

      socket.on("user-disconnected", () => {
        console.log("User disconnected");
        toast.info("User disconnected");
        handleCallEnd();
      });

      socket.on("message", (msg) => {
        console.log("Received message:", msg);
        setMessages((prevMessages) => [...prevMessages, msg]);
      });

      socket.on("file", (file) => {
        console.log("Received file:", file);
        setFile(file);
      });
    }
  }, [socket, peerConnection, userInfo]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate);
        socket.emit("newIceCandidate", {
          candidate: event.candidate,
          userToCall: incomingCallUser,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote stream:", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    setPeerConnection(pc);

    return pc;
  };

  const handleCallUser = async (userToCall) => {
    const pc = createPeerConnection();

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Sending video offer to", userToCall);
      socket.emit("videoOffer", { offer, userToCall, caller: userInfo.name });
      setCallStatus(`Calling ${userToCall}...`);
    } catch (error) {
      console.error("Error creating or sending video offer:", error);
      toast.error("Error creating or sending video offer.");
    }
  };

  const handleAcceptCall = async () => {
    const pc = createPeerConnection();

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Sending video answer to", incomingCallUser);
      socket.emit("videoAnswer", {
        answer,
        caller: incomingCallUser,
        userToCall: userInfo.name,
      });
      setCallStatus(`In call with ${incomingCallUser}`);
      setIncomingCall(false);
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Error accepting call.");
    }
  };

  const handleRejectCall = () => {
    console.log("Rejecting call from", incomingCallUser);
    socket.emit("rejectCall", { caller: incomingCallUser });
    setIncomingCall(false);
    setCallStatus("Call rejected");
  };

  const handleCallEnd = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
    }
    setCallStatus("Call ended");
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit("message", { text: message, user: userInfo.name });
      setMessage("");
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, user: userInfo.name },
      ]);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleSendFile = () => {
    if (file) {
      socket.emit("file", file);
      setFile(null);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ChatContainer>
      <Title>Video Chat Application</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading ? (
          <ClipLoader color="#007bff" loading={loading} size={50} />
        ) : (
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id}>
                <span>{user.name}</span>
                <Button onClick={() => handleCallUser(user.name)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>
      <div>
        {callStatus && <CallStatus connected={!!peerConnection}>{callStatus}</CallStatus>}
        <Video stream={localStream} />
        <Video stream={remoteStream} />
        {incomingCall && (
          <IncomingCall>
            <p>{`Incoming call from ${incomingCallUser}`}</p>
            <Button onClick={handleAcceptCall}>Accept</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <MessageContainer>
          <MessageInput
            placeholder="Type a message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            ref={messageRef}
          />
          <Button onClick={handleSendMessage}>Send Message</Button>
          <MessagesList>
            {messages.map((msg, index) => (
              <p key={index}>
                <strong>{msg.user}:</strong> {msg.text}
              </p>
            ))}
          </MessagesList>
          <FileInput type="file" onChange={handleFileChange} />
          <Button onClick={handleSendFile}>Send File</Button>
        </MessageContainer>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
