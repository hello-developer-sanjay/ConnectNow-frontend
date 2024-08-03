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

        // Mute the local audio track initially to avoid echo
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
      
        if (peerConnection) {
          if (peerConnection.signalingState === "stable") {
            try {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
              console.log("Remote description set successfully");
              setCallStatus(`In call with ${incomingCallUser}`);
            } catch (error) {
              console.error("Error setting remote description for answer:", error);
            }
          } else {
            console.warn("Peer connection is not in a stable state");
          }
        } else {
          console.warn("No peer connection initialized");
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
  }, [socket, userInfo, peerConnection, incomingCallUser]);

  const handleIncomingCall = async () => {
    if (offer && incomingCallUser) {
      const connection = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      setPeerConnection(connection);

      connection.ontrack = (event) => {
        setRemoteStream((prevStream) => {
          const newStream = new MediaStream(prevStream);
          newStream.addTrack(event.track);
          return newStream;
        });
      };

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", { candidate: event.candidate, to: incomingCallUser });
        }
      };

      connection.oniceconnectionstatechange = () => {
        if (connection.iceConnectionState === "disconnected") {
          handleCallEnd();
        }
      };

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          connection.addTrack(track, localStream);
        });
      }

      try {
        await connection.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Remote description set for offer");

        for (const candidate of iceCandidatesQueue.current) {
          await connection.addIceCandidate(candidate);
        }
        iceCandidatesQueue.current = [];

        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        socket.emit("videoAnswer", { answer, caller: incomingCallUser });

        setCallStatus(`In call with ${incomingCallUser}`);
        setIncomingCall(false);
      } catch (error) {
        console.error("Error handling incoming call:", error);
        toast.error("Error handling incoming call.");
      }
    }
  };

  const handleCallUser = async (userToCall) => {
    setCallStatus(`Calling ${userToCall}...`);

    const connection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    setPeerConnection(connection);

    connection.ontrack = (event) => {
      setRemoteStream((prevStream) => {
        const newStream = new MediaStream(prevStream);
        newStream.addTrack(event.track);
        return newStream;
      });
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { candidate: event.candidate, to: userToCall });
      }
    };

    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === "disconnected") {
        handleCallEnd();
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        connection.addTrack(track, localStream);
      });
    }

    try {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      socket.emit("videoOffer", { offer, caller: userInfo.name, userToCall });
    } catch (error) {
      console.error("Error calling user:", error);
      toast.error("Error calling user.");
    }
  };

  const handleCallEnd = () => {
    setCallStatus("");
    setIncomingCall(false);
    setIncomingCallUser("");
    setOffer(null);

    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    setRemoteStream(new MediaStream());
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const messageData = {
        user: userInfo.name,
        text: message,
        room,
      };

      socket.emit("message", messageData);
      setMessages((prevMessages) => [...prevMessages, messageData]);
      setMessage("");
    }
  };

  const handleSendFile = async () => {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(
          "https://connectnow-backend-24july.onrender.com/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const fileMessage = {
          user: userInfo.name,
          text: response.data.filePath,
          room,
          isFile: true,
        };

        socket.emit("fileMessage", fileMessage);
        setMessages((prevMessages) => [...prevMessages, fileMessage]);
        setFile(null);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error("Error uploading file.");
      }
    }
  };

  const handleMuteToggle = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const handleVideoToggle = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  return (
    <ChatContainer>
      <Title>Chat Room</Title>

      <div>
        <UserListContainer>
          <SearchInput
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearch}
          />
          {loading ? (
            <ClipLoader size={50} color={"#123abc"} loading={loading} />
          ) : (
            <UserList>
              {users
                .filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((user) => (
                  <UserItem key={user._id}>
                    <p>{user.name}</p>
                    <Button onClick={() => handleCallUser(user.name)}>Call</Button>
                  </UserItem>
                ))}
            </UserList>
          )}
        </UserListContainer>

        <CallStatus connected={!!callStatus}>{callStatus}</CallStatus>

        {incomingCall && (
          <IncomingCall>
            <p>{`${incomingCallUser} is calling...`}</p>
            <Button onClick={handleIncomingCall}>Accept</Button>
            <Button onClick={handleCallEnd}>Reject</Button>
          </IncomingCall>
        )}

        <div>
          <Button onClick={handleMuteToggle}>{isMuted ? "Unmute" : "Mute"}</Button>
          <Button onClick={handleVideoToggle}>{isVideoOff ? "Turn Video On" : "Turn Video Off"}</Button>
          <Button onClick={handleCallEnd}>End Call</Button>
        </div>
      </div>

      <Video localStream={localStream} remoteStream={remoteStream} />

      <MessageContainer>
        <MessagesList>
          {messages.map((msg, index) => (
            <Message key={index} message={msg} />
          ))}
        </MessagesList>
        <MessageInput
          rows="3"
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button onClick={handleSendMessage}>Send Message</Button>
        <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
        <Button onClick={handleSendFile}>Send File</Button>
      </MessageContainer>

      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
