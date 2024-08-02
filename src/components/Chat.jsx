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
    const newSocket = io('https://connectnow-backend-24july.onrender.com');
    setSocket(newSocket);

    if (userInfo) {
      newSocket.emit('joinRoom', { room: 'commonroom', user: userInfo.name });
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

        if (userToCall === userInfo?.name) {
          setIncomingCall(true);
          setIncomingCallUser(caller);
          setOffer(offer);
          setCallStatus(`Incoming call from ${caller}`);
        }
      });

      socket.on('videoAnswer', async ({ answer, caller }) => {
        console.log('Received video answer:', answer);
        toast.info('Received video answer');
    
        if (peerConnection && peerConnection.signalingState !== 'stable') {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log('Remote description set successfully');
                setCallStatus(`In call with ${incomingCallUser}`);
            } catch (error) {
                console.error('Error setting remote description for answer:', error);
            }
        } else {
            console.warn('No peer connection or peer connection is in a stable state');
        }
    });
    
      socket.on('newIceCandidate', async ({ candidate }) => {
        console.log('Received new ICE candidate:', candidate);
        toast.info('Received new ICE candidate');
    
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('Added ICE candidate successfully');
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        } else {
            iceCandidatesQueue.current.push(candidate);
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

      socket.on('fileMessage', (fileMessage) => {
        console.log('Received file message:', fileMessage);
        setMessages((prevMessages) => [...prevMessages, fileMessage]);
      });
    }
  }, [socket, userInfo, peerConnection, room]);

  const processQueuedIceCandidates = async () => {
    console.log('Processing queued ICE candidates:', iceCandidatesQueue.current);
    for (const candidate of iceCandidatesQueue.current) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added ICE candidate successfully');
      } catch (error) {
        console.error('Error adding queued ICE candidate:', error);
      }
    }
    iceCandidatesQueue.current = [];
  };

  const handleCallEnd = () => {
    console.log('Call ended');
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
    }
    setCallStatus('');
    setIncomingCall(false);
    setIncomingCallUser('');
    setOffer(null);
  };

  const handleAcceptCall = async () => {
    console.log('Accepting call from', incomingCallUser);
    toast.info('Call accepted');

    const peerConnectionConfig = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    const newPeerConnection = new RTCPeerConnection(peerConnectionConfig);

    localStream.getTracks().forEach((track) => {
      newPeerConnection.addTrack(track, localStream);
    });

    newPeerConnection.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('newIceCandidate', { candidate: event.candidate });
      }
    };

    try {
      await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await newPeerConnection.createAnswer();
      await newPeerConnection.setLocalDescription(answer);
      socket.emit('videoAnswer', { answer, caller: userInfo?.name });
      setPeerConnection(newPeerConnection);
      setCallStatus(`In call with ${incomingCallUser}`);
      await processQueuedIceCandidates();
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }

    setIncomingCall(false);
  };

  const handleRejectCall = () => {
    console.log('Call rejected');
    toast.info('Call rejected');
    setIncomingCall(false);
    setIncomingCallUser('');
    setOffer(null);
    setCallStatus('');
  };

  const handleCallUser = async (userToCall) => {
    console.log('Calling user', userToCall);
    toast.info(`Calling ${userToCall}`);

    const peerConnectionConfig = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    const newPeerConnection = new RTCPeerConnection(peerConnectionConfig);

    localStream.getTracks().forEach((track) => {
      newPeerConnection.addTrack(track, localStream);
    });

    newPeerConnection.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('newIceCandidate', { candidate: event.candidate });
      }
    };

    try {
      const offer = await newPeerConnection.createOffer();
      await newPeerConnection.setLocalDescription(offer);
      socket.emit('videoOffer', { offer, caller: userInfo?.name, userToCall });
      setPeerConnection(newPeerConnection);
      setCallStatus(`Calling ${userToCall}...`);
    } catch (error) {
      console.error('Error calling user:', error);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = (event) => {
    event.preventDefault();

    if (message.trim()) {
      socket.emit('message', { user: userInfo?.name, text: message });
      setMessages((prevMessages) => [
        ...prevMessages,
        { user: userInfo?.name, text: message },
      ]);
      setMessage('');
    }
  };

  const handleSendFile = async (event) => {
    event.preventDefault();

    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(
          'https://connectnow-backend-24july.onrender.com/upload',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        const fileMessage = {
          user: userInfo?.name,
          fileUrl: response.data.fileUrl,
        };

        socket.emit('fileMessage', fileMessage);
        setMessages((prevMessages) => [...prevMessages, fileMessage]);
        setFile(null);
      } catch (error) {
        console.error('Error sending file:', error);
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <ChatContainer>
      <Title>Chat Application</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {loading ? (
          <ClipLoader size={50} color="#123abc" loading={true} />
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
      <div>
        <Video localStream={localStream} remoteStream={remoteStream} />
        <CallStatus connected={callStatus.includes('In call')}>
          {callStatus}
        </CallStatus>
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling you</p>
            <Button onClick={handleAcceptCall}>Accept</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <Button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={toggleVideo}>
          {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
        </Button>
        <MessageContainer>
          <MessagesList ref={messageRef}>
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
          </MessagesList>
          <form onSubmit={handleSendMessage}>
            <MessageInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
            />
            <Button type="submit">Send</Button>
          </form>
          <form onSubmit={handleSendFile}>
            <FileInput
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <Button type="submit">Send File</Button>
          </form>
        </MessageContainer>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
