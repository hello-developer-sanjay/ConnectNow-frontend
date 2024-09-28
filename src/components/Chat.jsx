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
    dispatch(listUsers());
    const newSocket = io("https://connectnow-backend-24july.onrender.com");
    setSocket(newSocket);
    if (userInfo) {
      newSocket.emit("joinRoom", { room: "commonroom", user: userInfo.name });
    }
    return () => newSocket.close();
  }, [dispatch, userInfo]);

 
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true, // Ensure audio is captured
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
        if (userToCall === userInfo?.name) {
          setIncomingCall(true);
          setIncomingCallUser(caller);
          setOffer(offer);
        }
      });

      socket.on("videoAnswer", async ({ answer }) => {
        if (peerConnection && peerConnection.signalingState === "have-local-offer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("Remote description set for answer");
        }
      });

      socket.on("newIceCandidate", async ({ candidate }) => {
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on("user-disconnected", () => {
        handleCallEnd();
      });
    }
  }, [socket, peerConnection]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("newIceCandidate", {
          candidate: event.candidate,
          userToSendTo: incomingCallUser,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);  // Ensure both audio and video are added
    });

    return pc;
  };


   const handleCallUser = async (userToCall) => {
    const pc = createPeerConnection();
    setPeerConnection(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("videoOffer", {
      offer,
      caller: userInfo.name,
      userToCall,
    });
  };


  const handleAcceptCall = async () => {
    const pc = createPeerConnection();
    setPeerConnection(pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("videoAnswer", { answer, caller: incomingCallUser });
    setIncomingCall(false);
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
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      user.name !== userInfo?.name
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
