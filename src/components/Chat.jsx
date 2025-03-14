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
  const [users, setUsers] = useState([]);

  const dispatch = useDispatch();
  const userLogin = useSelector((state) => state.userLogin);
  const { userInfo } = userLogin;

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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

    newSocket.on("videoOffer", handleVideoOffer);
    newSocket.on("videoAnswer", handleVideoAnswer);
    newSocket.on("newIceCandidate", handleNewIceCandidate);
    newSocket.on("user-disconnected", handleCallEnd);

    return () => {
      newSocket.close();
    };
  }, [userInfo]);

  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    initLocalStream();
  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("newIceCandidate", { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

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

    setCallStatus(`Calling ${userToCall}...`);
  };

  const handleVideoOffer = async ({ offer, caller }) => {
    setIncomingCall(true);
    setIncomingCallUser(caller);
    setOffer(offer);
    setCallStatus(`Incoming call from ${caller}`);
  };

  const handleAcceptCall = async () => {
    const pc = createPeerConnection();
    setPeerConnection(pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("videoAnswer", { answer, caller: incomingCallUser });
    setIncomingCall(false);
    setCallStatus(`In call with ${incomingCallUser}`);
  };

  const handleVideoAnswer = async ({ answer }) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleNewIceCandidate = async ({ candidate }) => {
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const handleCallEnd = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setCallStatus("");
    setRemoteStream(new MediaStream());
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  return (
    <div>
      <h2>Video Chat</h2>
      <div>
        <video ref={localVideoRef} autoPlay muted style={{ width: "300px" }} />
        <video ref={remoteVideoRef} autoPlay style={{ width: "300px" }} />
      </div>

      {incomingCall && (
        <div>
          <p>Incoming call from {incomingCallUser}</p>
          <button onClick={handleAcceptCall}>Accept</button>
          <button onClick={handleCallEnd}>Reject</button>
        </div>
      )}

      <div>
        {users.map((user) => (
          <button key={user.name} onClick={() => handleCallUser(user.name)}>
            Call {user.name}
          </button>
        ))}
      </div>

      <p>{callStatus}</p>

      <ToastContainer />
    </div>
  );
};

export default Chat;
