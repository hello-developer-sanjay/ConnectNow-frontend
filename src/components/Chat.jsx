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
          await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));

          const answer = await newPeerConnection.createAnswer();
          await newPeerConnection.setLocalDescription(answer);

          console.log('Sending video answer:', answer);
          toast.info('Sending video answer');
          socket.emit('videoAnswer', { answer, caller: userInfo.name });

          setIncomingCall(true);
          setIncomingCallUser(caller);
          setCallStatus(`Incoming call from ${caller}`);
        }
      });

      socket.on('videoAnswer', async ({ answer }) => {
        console.log('Received video answer:', answer);
        toast.info('Received video answer');
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on('newIceCandidate', ({ candidate }) => {
        console.log('Received new ICE candidate:', candidate);
        toast.info('Received new ICE candidate');
        const newCandidate = new RTCIceCandidate(candidate);
        peerConnection.addIceCandidate(newCandidate).catch((error) => {
          console.error('Error adding received ICE candidate:', error);
        });
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

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }
  }, [peerConnection, localStream]);

  const createPeerConnection = () => {
    const newPeerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    });

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

    setPeerConnection(newPeerConnection);
    console.log('Created new RTCPeerConnection');
    return newPeerConnection;
  };

  const handleCallUser = async (userToCall) => {
    if (!localStream) {
      toast.error('Unable to access your camera and microphone.');
      return;
    }

    const newPeerConnection = createPeerConnection();
    const offer = await newPeerConnection.createOffer();
    await newPeerConnection.setLocalDescription(offer);

    console.log('Sending video offer:', offer);
    toast.info(`Calling ${userToCall}...`);

    socket.emit('videoOffer', { offer, userToCall, caller: userInfo.name });
    setOffer(offer);
    setCallStatus(`Calling ${userToCall}...`);
  };

 const handleAcceptCall = async () => {
  if (offer) {
    const newPeerConnection = createPeerConnection();

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socket.emit('newIceCandidate', { candidate: event.candidate, room });
      }
    };

    newPeerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track);
      setRemoteStream((prevStream) => {
        prevStream.addTrack(event.track);
        return prevStream;
      });
    };

    try {
      localStream.getTracks().forEach((track) => newPeerConnection.addTrack(track, localStream));

      if (newPeerConnection.signalingState === 'stable') {
        console.log('Connection is already stable, cannot set remote offer');
        return;
      }

      await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await newPeerConnection.createAnswer();
      await newPeerConnection.setLocalDescription(answer);

      console.log('Sending video answer:', answer);
      socket.emit('videoAnswer', { answer, caller: incomingCallUser });

      setCallStatus(`Connected with ${incomingCallUser}`);
      setPeerConnection(newPeerConnection);
      setIncomingCall(false);
      setOffer(null);
    } catch (error) {
      console.error('Error handling accept call:', error);
      toast.error('Error accepting call.');
    }
  }
};

  const handleRejectCall = () => {
    console.log('Rejecting call from:', incomingCallUser);
    toast.info(`Rejected call from ${incomingCallUser}`);
    setIncomingCall(false);
    socket.emit('rejectCall', { caller: incomingCallUser });
  };

  const handleCallEnd = () => {
    console.log('Ending call');
    toast.info('Call ended');
    peerConnection.close();
    setPeerConnection(null);
    setRemoteStream(new MediaStream());
    setCallStatus('');
    setIncomingCall(false);
  };

  const handleToggleMute = () => {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted((prevState) => !prevState);
    toast.info(isMuted ? 'Unmuted' : 'Muted');
  };

  const handleToggleVideo = () => {
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff((prevState) => !prevState);
    toast.info(isVideoOff ? 'Video turned on' : 'Video turned off');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('user', userInfo.name);
    formData.append('message', message);
    if (file) {
      formData.append('file', file);
    }

    try {
      await axios.post('https://connectnow-backend-24july.onrender.com/send', formData);
      setMessage('');
      setFile(null);
      toast.info('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ChatContainer>
      <Title>ConnectNow - Video Chat</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
        <ToastContainer />
      </UserListContainer>
      <div>
        <Video
          localStream={localStream}
          remoteStream={remoteStream}
          toggleMute={handleToggleMute}
          toggleVideo={handleToggleVideo}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
        />
        <CallStatus connected={callStatus.includes('Connected')}>
          {callStatus}
        </CallStatus>
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling...</p>
            <Button onClick={handleAcceptCall}>Accept</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <MessageContainer>
          <form onSubmit={handleSendMessage}>
            <MessageInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
              rows="4"
            />
            <FileInput type="file" onChange={handleFileChange} />
            <Button type="submit">Send</Button>
          </form>
          <MessagesList ref={messageRef}>
            {messages.map((msg, index) => (
              <Message key={index} user={msg.user} message={msg.message} fileUrl={msg.fileUrl} />
            ))}
          </MessagesList>
        </MessageContainer>
      </div>
    </ChatContainer>
  );
};

export default Chat;
