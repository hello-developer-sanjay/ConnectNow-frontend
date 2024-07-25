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
        socket.emit('iceCandidate', { room, candidate: event.candidate });
      }
    };

    newPeerConnection.ontrack = (event) => {
      console.log('Ontrack event:', event);
      setRemoteStream((prevStream) => {
        const newStream = new MediaStream(prevStream);
        newStream.addTrack(event.track);
        return newStream;
      });
    };

    newPeerConnection.onconnectionstatechange = () => {
      if (newPeerConnection.connectionState === 'disconnected') {
        console.log('Peer connection disconnected.');
        resetCall();
      }
    };

    return newPeerConnection;
  };

  const startCall = async (callee) => {
    if (socket && localStream) {
      const newPeerConnection = createPeerConnection();
      setPeerConnection(newPeerConnection);

      localStream.getTracks().forEach((track) => newPeerConnection.addTrack(track, localStream));

      const offer = await newPeerConnection.createOffer();
      await newPeerConnection.setLocalDescription(new RTCSessionDescription(offer));
      socket.emit('videoOffer', { room, offer, callee, caller: userInfo._id });
    }
  };

  const acceptCall = async () => {
    if (socket && peerConnection && localStream) {
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
      socket.emit('videoAnswer', { room, answer, caller: incomingCallUser });
      setIncomingCall(false);
      stopTune();
      setCallStatus('Connected');
    }
  };

  const rejectCall = () => {
    if (socket) {
      socket.emit('callRejected', { room, caller: incomingCallUser });
      setIncomingCall(false);
      stopTune();
      setCallStatus('Call rejected');
    }
  };

  const resetCall = () => {
    setLocalStream(null);
    setRemoteStream(new MediaStream());
    setPeerConnection(null);
    setCallStatus('');
    setIncomingCall(false);
    setIncomingCallUser('');
    stopTune();
  };

  const muteUnmuteAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsMuted((prev) => !prev);
    }
  };

  const turnOnOffVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsVideoOff((prev) => !prev);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredUsers = users.filter(
    (user) =>
      user._id !== userInfo._id &&
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollToBottom = () => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  };

  const joinRoom = async () => {
    if (localStream) {
      alert('You are already in the room.');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    toast.success('Successfully joined the room.');
    socket.emit('joinRoom', { room });
  };

  const leaveRoom = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setRemoteStream(null);
    socket.emit('leaveRoom', { room });
    toast.info('You have left the room.');
  };

  const sendMessage = async () => {
    if (message.trim()) {
      const newMessage = {
        text: message,
        sender: userInfo._id,
        room,
        createdAt: new Date().toISOString(),
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage('');

      socket.emit('sendMessage', newMessage);
    }
  };

  const sendFile = async () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const { data } = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const newMessage = {
          text: data.filePath,
          sender: userInfo._id,
          room,
          createdAt: new Date().toISOString(),
        };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setFile(null);

        socket.emit('sendMessage', newMessage);
      } catch (error) {
        toast.error('Failed to upload file');
      }
    }
  };

  const playTune = () => {
    const tune = new Audio('/path/to/tune.mp3');
    tune.loop = true;
    tune.play();
  };

  const stopTune = () => {
    const tune = new Audio('/path/to/tune.mp3');
    tune.pause();
    tune.currentTime = 0;
  };

  return (
    <ChatContainer>
      <Title>ConnectNow Video Chat</Title>
      <Button onClick={joinRoom}>Join Room</Button>
      <Button onClick={leaveRoom}>Leave Room</Button>

      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {loading ? (
          <ClipLoader color={'#007bff'} loading={loading} size={50} />
        ) : (
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id}>
                <p>{user.name}</p>
                <Button onClick={() => startCall(user._id)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>
      <Video
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        muteUnmuteAudio={muteUnmuteAudio}
        turnOnOffVideo={turnOnOffVideo}
      />
      <CallStatus connected={callStatus === 'Connected'}>
        {callStatus}
      </CallStatus>
      {incomingCall && (
        <IncomingCall>
          <p>Incoming call from {incomingCallUser}</p>
          <Button onClick={acceptCall}>Accept</Button>
          <Button onClick={rejectCall}>Reject</Button>
        </IncomingCall>
      )}
      <MessageContainer>
        <MessagesList ref={messageRef}>
          {messages.map((msg, index) => (
            <Message key={index} message={msg} />
          ))}
        </MessagesList>
        <MessageInput
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <Button onClick={sendMessage}>Send</Button>
        <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
        <Button onClick={sendFile}>Send File</Button>
      </MessageContainer>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
