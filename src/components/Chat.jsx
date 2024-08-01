import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Video from './Video';
import { useDispatch, useSelector } from 'react-redux';
import { listUsers } from '../actions/userActions';
import styled from 'styled-components';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ClipLoader from 'react-spinners/ClipLoader';
import Message from './Message';
import axios from 'axios';

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
  color: ${(props) => (props.connected ? 'green' : 'red')};
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
  const [room, setRoom] = useState('commonroom');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(new MediaStream());
  const [peerConnection, setPeerConnection] = useState(null);
  const [callStatus, setCallStatus] = useState('');
  const [incomingCall, setIncomingCall] = useState(false);
  const [incomingCallUser, setIncomingCallUser] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [offer, setOffer] = useState(null);
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
    const newSocket = io('https://connectnow-backend-24july.onrender.com');
    setSocket(newSocket);

    // Automatically join the room
    newSocket.emit('joinRoom', { room: 'commonroom', user: userInfo.name });

    return () => newSocket.close();
  }, [userInfo]);

  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        console.log('Local stream set:', stream);
      } catch (error) {
        console.error('Error accessing media devices.', error);
        toast.error('Error accessing media devices.');
      }
    };

    initLocalStream();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('videoOffer', async ({ offer, caller, userToCall }) => {
        console.log('Received video offer:', offer, caller, userToCall);
        toast.info(`Received video offer from ${caller}`);

        if (userToCall === userInfo.name) {
          const newPeerConnection = createPeerConnection();

          // Ensure the connection is fresh
          await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));

          const answer = await newPeerConnection.createAnswer();
          await newPeerConnection.setLocalDescription(answer);

          console.log('Sending video answer:', answer);
          toast.info('Sending video answer');
          socket.emit('videoAnswer', { answer, caller: userInfo.name });

          setIncomingCall(true);
          setIncomingCallUser(caller);
          setCallStatus(`Incoming call from ${caller}`);
          setPeerConnection(newPeerConnection);
        }
      });

      socket.on('videoAnswer', async ({ answer }) => {
        console.log('Received video answer:', answer);
        toast.info('Received video answer');
        if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (error) {
            console.error('Error setting remote description for answer:', error);
          }
        } else {
          console.error('No peer connection or peer connection is in a stable state');
        }
      });

      socket.on('newIceCandidate', ({ candidate }) => {
        console.log('Received new ICE candidate:', candidate);
        toast.info('Received new ICE candidate');
        if (peerConnection) {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch((error) => {
            console.error('Error adding received ICE candidate:', error);
          });
        }
      });

      socket.on('user-disconnected', () => {
        console.log('User disconnected');
        toast.info('User disconnected');
        handleCallEnd();
      });

      socket.on('message', (message) => {
        console.log('Received message:', message);
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      socket.on('joinRoomConfirmation', ({ user, room }) => {
        console.log(`${user} joined ${room}`);
        toast.info(`${user} joined ${room}`);
      });
    }
  }, [socket, peerConnection]);

  useEffect(() => {
    if (peerConnection) {
      peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track);
        setRemoteStream((prevStream) => {
          prevStream.addTrack(event.track);
          return prevStream;
        });
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate:', event.candidate);
          toast.info('Sending ICE candidate');
          socket.emit('newIceCandidate', { candidate: event.candidate });
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state change:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'disconnected') {
          handleCallEnd();
        }
      };

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }
    }
  }, [peerConnection, localStream]);

  const createPeerConnection = () => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:YOUR_TURN_SERVER_URL',
          username: 'YOUR_USERNAME',
          credential: 'YOUR_CREDENTIAL',
        },
      ],
    };
    return new RTCPeerConnection(config);
  };

  const handleCallUser = async (userToCall) => {
    if (!localStream) {
      toast.error('Local stream not available.');
      return;
    }

    const newPeerConnection = createPeerConnection();
    setPeerConnection(newPeerConnection);

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        toast.info('Sending ICE candidate');
        socket.emit('newIceCandidate', { candidate: event.candidate });
      }
    };

    newPeerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track);
      setRemoteStream((prevStream) => {
        prevStream.addTrack(event.track);
        return prevStream;
      });
    };

    localStream.getTracks().forEach((track) => {
      newPeerConnection.addTrack(track, localStream);
    });

    const offer = await newPeerConnection.createOffer();
    await newPeerConnection.setLocalDescription(offer);

    console.log('Calling user:', userToCall);
    toast.info(`Calling ${userToCall}...`);
    socket.emit('videoOffer', { offer, userToCall, caller: userInfo.name });
    setCallStatus(`Calling ${userToCall}...`);
  };

  const handleAnswerCall = async () => {
    if (offer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('videoAnswer', { answer, caller: userInfo.name });
    }
  };

  const handleRejectCall = () => {
    setIncomingCall(false);
    setIncomingCallUser('');
    setCallStatus('');
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
  };

  const handleToggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleCallEnd = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
    }
    setCallStatus('');
  };

  const handleJoinRoom = () => {
    socket.emit('joinRoom', { room, user: userInfo.name });
    toast.success(`Joined room: ${room}`);
  };

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom', { room, user: userInfo.name });
    toast.success(`Left room: ${room}`);
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('message', { user: userInfo.name, text: message, room });
      setMessage('');
    }
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      socket.emit('fileMessage', { user: userInfo.name, file: data.filePath, room });
      setFile(null);
      toast.success('File sent successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error uploading file');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ChatContainer>
      <Title>Video Chat</Title>
      <div>
        <UserListContainer>
          <SearchInput
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {loading ? (
            <ClipLoader size={50} color="#007bff" />
          ) : (
            <UserList>
              {filteredUsers.map((user) => (
                <UserItem key={user._id}>
                  <p>{user.name}</p>
                  <Button onClick={() => handleCallUser(user.name)}>Call</Button>
                </UserItem>
              ))}
            </UserList>
          )}
        </UserListContainer>
        <CallStatus connected={callStatus.includes('connected')}>
          {callStatus || 'No active calls'}
        </CallStatus>
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling...</p>
            <Button onClick={handleAnswerCall}>Answer</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <div>
          <Button onClick={handleToggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
          <Button onClick={handleToggleVideo}>
            {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
          </Button>
          <Button onClick={handleCallEnd}>End Call</Button>
        </div>
        <div>
          <Button onClick={handleJoinRoom}>Join Room</Button>
          <Button onClick={handleLeaveRoom}>Leave Room</Button>
        </div>
      </div>
      <div>
        <Video localStream={localStream} remoteStream={remoteStream} />
        <MessageContainer>
          <MessageInput
            rows="4"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            ref={messageRef}
          />
          <Button onClick={sendMessage}>Send</Button>
          <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
          <Button onClick={handleFileUpload}>Send File</Button>
          <MessagesList>
            {messages.map((msg, index) => (
              <Message key={index} user={msg.user} text={msg.text} file={msg.file} />
            ))}
          </MessagesList>
        </MessageContainer>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
