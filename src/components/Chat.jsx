// Chat.jsx

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
  const [room, setRoom] = useState('commonRoom');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
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
    console.log('Socket connection established:', newSocket.id);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('videoOffer', async (data) => {
        console.log('Received video offer:', data);
        const { offer, caller } = data;
        const newPeerConnection = createPeerConnection();
        setPeerConnection(newPeerConnection);
        await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        setIncomingCall(true);
        setIncomingCallUser(caller);
        playTune();
      });

      socket.on('videoAnswer', async (data) => {
        console.log('Received video answer:', data);
        const { answer } = data;
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
        setCallStatus('Connected');
      });

      socket.on('iceCandidate', async (data) => {
        console.log('Received ICE candidate:', data);
        const { candidate } = data;
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on('callRejected', () => {
        console.log('Call rejected by the user.');
        setCallStatus('Call rejected by the user.');
        toast.warning('The user rejected your call.');
      });

      socket.on('callDisconnected', () => {
        console.log('Call disconnected.');
        setCallStatus('Call disconnected.');
        toast.info('The call has been disconnected.');
        resetCall();
      });

      socket.on('userBusy', () => {
        console.log('User is busy.');
        setCallStatus('User is busy');
        toast.warning('The user is currently on another call.');
      });

      socket.on('receiveMessage', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
        scrollToBottom();
      });

      socket.emit('joinRoom', { room });
    }
  }, [socket, peerConnection, localStream]);

  const createPeerConnection = () => {
    const newPeerConnection = new RTCPeerConnection();
    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socket.emit('iceCandidate', { room, candidate: event.candidate });
      }
    };

    newPeerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        newPeerConnection.addTrack(track, localStream);
      });
    }

    return newPeerConnection;
  };

  const startCall = async (userId) => {
    if (!localStream) {
      alert('Please join the room first to start a call.');
      return;
    }
    console.log('Starting call with user:', userId);
    const newPeerConnection = createPeerConnection();
    setPeerConnection(newPeerConnection);

    const offer = await newPeerConnection.createOffer();
    await newPeerConnection.setLocalDescription(offer);
    socket.emit('videoOffer', { room, userId, offer, caller: userInfo.name });
    setCallStatus('Calling...');
    playTune();
    console.log('Video offer sent:', offer);
  };

  const joinRoom = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    socket.emit('joinRoom', { room });
    console.log('Joined room:', room);
  };

  const playTune = () => {
    const audio = new Audio('/src/assets/discord.mp3');
    audio.play();
    console.log('Playing tune');
  };

  const acceptCall = async () => {
    if (peerConnection) {
      const state = peerConnection.signalingState;
      console.log('Peer connection state before creating answer:', state);
      if (state === 'have-remote-offer' || state === 'have-local-pranswer') {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('videoAnswer', { room, answer });
        setCallStatus('Connected');
        setIncomingCall(false);
        console.log('Call accepted, answer sent:', answer);
      } else {
        console.error('Cannot create an answer in state:', state);
      }
    }
  };

  const rejectCall = () => {
    socket.emit('callRejected', { room });
    setCallStatus('Call rejected.');
    setIncomingCall(false);
    console.log('Call rejected');
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    socket.emit('callDisconnected', { room });
    setCallStatus('Call ended.');
    resetCall();
    console.log('Call ended');
  };

  const resetCall = () => {
    setRemoteStream(null);
    setCallStatus('');
    console.log('Call reset');
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit('sendMessage', { room, userId: userInfo._id, text: message });
      setMessages([...messages, { text: message, sender: userInfo.name }]);
      setMessage('');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        toast.error('No token found, please log in again.');
        return;
    }

    try {
        const { data } = await axios.post('https://connectnow-backend-24july.onrender.com/api/messages/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}` 
            },
        });

        socket.emit('sendMessage', { room, userId: userInfo._id, text: '', fileUrl: data.url });
        setFile(null);
    } catch (error) {
        toast.error('File upload failed: ' + (error.response?.data?.message || 'An error occurred'));
    }
};


  const handleMuteToggle = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
      setIsMuted(!isMuted);
    }
  };

  const handleVideoToggle = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  const scrollToBottom = () => {
    messageRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <ChatContainer>
      <Title>Chat</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <UserList>
          {filteredUsers.map((user) => (
            <UserItem key={user._id}>
              <p>{user.name}</p>
              {user._id !== userInfo._id && <Button onClick={() => startCall(user._id)}>Call</Button>}
            </UserItem>
          ))}
        </UserList>
      </UserListContainer>
      <div>
        <Button onClick={joinRoom}>Join Room</Button>
        {callStatus && <CallStatus connected={callStatus === 'Connected'}>Status: {callStatus}</CallStatus>}
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling you.</p>
            <Button onClick={acceptCall}>Accept</Button>
            <Button onClick={rejectCall}>Reject</Button>
          </IncomingCall>
        )}
        {callStatus === 'Connected' && <Button onClick={endCall}>End Call</Button>}
        <Button onClick={handleMuteToggle}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleVideoToggle}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
        <MessageContainer>
          <MessagesList>
            {messages.map((msg, index) => (
              <Message key={index} sender={msg.sender} text={msg.text} fileUrl={msg.fileUrl} />
            ))}
            <div ref={messageRef} />
          </MessagesList>
          <MessageInput
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows="3"
            placeholder="Type a message..."
          />
          <Button onClick={handleSendMessage}>Send</Button>
          <FileInput type="file" onChange={handleFileChange} />
          <Button onClick={handleFileUpload}>Upload File</Button>
        </MessageContainer>
        {loading && <ClipLoader />}
        <Video localStream={localStream} remoteStream={remoteStream} />
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
