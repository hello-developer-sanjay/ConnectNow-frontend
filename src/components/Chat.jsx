import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Video from "./Video";
import { useDispatch, useSelector } from "react-redux";
import { listUsers } from "../actions/userActions";
import styled from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import Message from "./Message";
import axios from "axios";

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
  const [room, setRoom] = useState("commonroom");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(new MediaStream());
  const [peerConnection, setPeerConnection] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [incomingCall, setIncomingCall] = useState(false);
  const [incomingCallUser, setIncomingCallUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [offer, setOffer] = useState(null);
  const messageRef = useRef();
  const iceCandidatesQueue = useRef([]);

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
    setRoom;

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
          // Mute the local audio to avoid echo
        stream.getAudioTracks().forEach(track => {
          track.enabled = false;
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

        if (peerConnection && peerConnection.signalingState !== "stable") {
          try {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(answer)
            );
            console.log("Remote description set successfully");
            setCallStatus(`In call with ${incomingCallUser}`);
          } catch (error) {
            console.error(
              "Error setting remote description for answer:",
              error
            );
          }
        } else {
          console.warn(
            "No peer connection or peer connection is in a stable state"
          );
        }
      });

      socket.on("newIceCandidate", async ({ candidate }) => {
        console.log("Received new ICE candidate:", candidate);
        toast.info("Received new ICE candidate");

        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("Added ICE candidate successfully");
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      });

      socket.on("user-disconnected", () => {
        console.log("User disconnected");
        toast.info("User disconnected");
        handleCallEnd();
      });

      socket.on("message", (message) => {
        console.log("Received message:", message);
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      socket.on("joinRoomConfirmation", ({ user, room }) => {
        console.log(`${user} joined ${room}`);
        toast.info(`${user} joined ${room}`);
      });

      socket.on("fileMessage", (fileMessage) => {
        console.log("Received file message:", fileMessage);
        setMessages((prevMessages) => [...prevMessages, fileMessage]);
      });

      socket.on("connect", () => {
        console.log("Connected to socket server");
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from socket server");
      });
    }

    return () => {
      if (socket) {
        socket.off("videoOffer");
        socket.off("videoAnswer");
        socket.off("newIceCandidate");
        socket.off("user-disconnected");
        socket.off("message");
        socket.off("joinRoomConfirmation");
        socket.off("fileMessage");
        socket.off("connect");
        socket.off("disconnect");
      }
    };
  }, [socket, peerConnection, incomingCallUser, userInfo?.name]);

  const handleCallUser = async (userToCall) => {
    console.log("Calling user:", userToCall);

    const peerConnection = createPeerConnection();

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      setPeerConnection(peerConnection);
      setCallStatus(`Calling ${userToCall}`);
      console.log("Sending video offer:", offer);

      socket.emit("videoOffer", {
        offer,
        userToCall,
        caller: userInfo?.name,
      });
    } catch (error) {
      console.error("Error during call setup:", error);
      toast.error("Error during call setup");
    }
  };

  const handleAnswerCall = async () => {
    console.log("Answering call from:", incomingCallUser);
    toast.info(`Answering call from ${incomingCallUser}`);

    const peerConnection = createPeerConnection();

    try {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      setPeerConnection(peerConnection);
      setCallStatus(`In call with ${incomingCallUser}`);
      console.log("Sending video answer:", answer);

      socket.emit("videoAnswer", {
        answer,
        caller: userInfo?.name,
        userToCall: incomingCallUser,
      });
    } catch (error) {
      console.error("Error during call answer:", error);
      toast.error("Error during call answer");
    }
  };

  const handleRejectCall = () => {
    setIncomingCall(false);
    setIncomingCallUser("");
    setOffer(null);
    setCallStatus("");
  };

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };

    const newPeerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
      newPeerConnection.addTrack(track, localStream);
    });

    newPeerConnection.ontrack = (event) => {
      console.log("Remote stream received:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate);
        socket.emit("newIceCandidate", {
          candidate: event.candidate,
          caller: userInfo?.name,
        });
      }
    };

    newPeerConnection.onconnectionstatechange = () => {
      if (newPeerConnection.connectionState === "connected") {
        setCallStatus("Call connected");
        console.log("Call connected");
      } else if (
        newPeerConnection.connectionState === "disconnected" ||
        newPeerConnection.connectionState === "failed" ||
        newPeerConnection.connectionState === "closed"
      ) {
        setCallStatus("Call ended");
        console.log("Call ended");
        handleCallEnd();
      }
    };

    // Add queued ICE candidates
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      newPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    return newPeerConnection;
  };

  const handleCallEnd = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setRemoteStream(new MediaStream());
    setCallStatus("");
    setIncomingCall(false);
    setIncomingCallUser("");
    setOffer(null);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const newMessage = {
        user: userInfo?.name,
        text: message,
        time: new Date().toLocaleTimeString(),
      };
      socket.emit("message", newMessage);
      setMessages([...messages, newMessage]);
      setMessage("");
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  };

  const handleSendFile = async (e) => {
    e.preventDefault();
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await axios.post(
          "https://connectnow-backend-24july.onrender.com/api/files/upload",
          formData
        );

        const fileMessage = {
          user: userInfo?.name,
          fileName: file.name,
          fileUrl: data.fileUrl,
          time: new Date().toLocaleTimeString(),
        };

        socket.emit("fileMessage", fileMessage);
        setMessages([...messages, fileMessage]);
        setFile(null);
        toast.success("File sent successfully");
      } catch (error) {
        console.error("Error sending file:", error);
        toast.error("Error sending file");
      }
    }
  };

  return (
    <ChatContainer>
      <ToastContainer />
      <Title>Welcome to the Chat Room, {userInfo?.name}</Title>

      <UserListContainer>
        <h2>User List</h2>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading ? (
          <ClipLoader color="#007bff" />
        ) : (
          <UserList>
            {users
              .filter((user) =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((user) => (
                <UserItem key={user._id}>
                  <p>{user.name}</p>
                  <Button onClick={() => handleCallUser(user.name)}>
                    Call
                  </Button>
                </UserItem>
              ))}
          </UserList>
        )}
      </UserListContainer>

      <MessageContainer>
        <MessagesList ref={messageRef}>
          {messages.map((msg, index) => (
            <Message key={index} message={msg} />
          ))}
        </MessagesList>

        <MessageInput
          rows="3"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button onClick={handleSendMessage}>Send Message</Button>

        <FileInput
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <Button onClick={handleSendFile}>Send File</Button>
      </MessageContainer>

      <Video
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        toggleMute={toggleMute}
        toggleVideo={toggleVideo}
      />

      <CallStatus connected={callStatus.includes("connected")}>
        {callStatus}
      </CallStatus>

      {incomingCall && (
        <IncomingCall>
          <p>Incoming call from {incomingCallUser}</p>
          <Button onClick={handleAnswerCall}>Answer</Button>
          <Button onClick={handleRejectCall}>Reject</Button>
        </IncomingCall>
      )}

      {callStatus.includes("connected") && (
        <Button onClick={handleCallEnd}>End Call</Button>
      )}
    </ChatContainer>
  );
};

export default Chat;
