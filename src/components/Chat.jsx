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

      socket.on('callEnded', () => {
        console.log('Call ended by the user.');
        setCallStatus('Call ended by the user.');
        toast.info('The call was ended by the user.');
        if (peerConnection) {
          peerConnection.close();
          setPeerConnection(null);
        }
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
          setLocalStream(null);
        }
        setRemoteStream(null);
      });

      socket.on('chatMessage', (data) => {
        console.log('Received chat message:', data);
        setMessages((prevMessages) => [...prevMessages, data]);
      });
    }
  }, [socket, peerConnection, localStream, remoteStream]);

  const createPeerConnection = () => {
    const newPeerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    });

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { candidate: event.candidate });
      }
    };

    newPeerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
      }
      setRemoteStream(event.streams[0]);
    };

    return newPeerConnection;
  };

  const handleCall = async (callee) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      const newPeerConnection = createPeerConnection();
      setPeerConnection(newPeerConnection);

      stream.getTracks().forEach((track) => newPeerConnection.addTrack(track, stream));
      const offer = await newPeerConnection.createOffer();
      await newPeerConnection.setLocalDescription(new RTCSessionDescription(offer));
      socket.emit('videoOffer', { offer, callee, caller: userInfo.name });
      setCallStatus(`Calling ${callee}...`);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const handleAcceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (peerConnection) {
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
        socket.emit('videoAnswer', { answer, caller: incomingCallUser });
        setCallStatus(`Connected to ${incomingCallUser}`);
      }
      setIncomingCall(false);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleRejectCall = () => {
    setIncomingCall(false);
    socket.emit('callRejected', { caller: incomingCallUser });
    setIncomingCallUser('');
    stopTune();
  };

  const handleEndCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    socket.emit('callEnded', { callee: incomingCallUser });
    setCallStatus('Call ended');
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('chatMessage', { user: userInfo.name, message });
      setMessages((prevMessages) => [...prevMessages, { user: userInfo.name, message }]);
      setMessage('');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSendFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axios.post('https://connectnow-backend-24july.onrender.com/upload', formData);
      socket.emit('fileMessage', { user: userInfo.name, fileUrl: data.fileUrl });
      setMessages((prevMessages) => [...prevMessages, { user: userInfo.name, fileUrl: data.fileUrl }]);
      setFile(null);
    } catch (error) {
      console.error('Error sending file:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMuted;
    }
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = isVideoOff;
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

  return (
    <ChatContainer>
      <Title>Connect Now - Video & Chat</Title>
      <Button onClick={joinRoom}>Join Room</Button>
      <Button onClick={leaveRoom}>Leave Room</Button>
      
      <div>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <UserListContainer>
          <ClipLoader loading={loading} size={50} color="#007bff" />
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id}>
                <p>{user.name}</p>
                <Button onClick={() => handleCall(user.name)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        </UserListContainer>
        {incomingCall && (
          <IncomingCall>
            <p>Incoming call from {incomingCallUser}</p>
            <Button onClick={handleAcceptCall}>Accept</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <CallStatus connected={callStatus === 'Connected'}>
          {callStatus}
        </CallStatus>
        <Button onClick={handleEndCall}>End Call</Button>
        <Video
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          toggleMute={toggleMute}
          isVideoOff={isVideoOff}
          toggleVideo={toggleVideo}
        />
      </div>
      <MessageContainer>
        <form onSubmit={sendMessage}>
          <MessageInput
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <Button type="submit">Send</Button>
        </form>
        <FileInput type="file" onChange={handleFileChange} />
        <Button onClick={handleSendFile}>Send File</Button>
        <MessagesList ref={messageRef}>
          {messages.map((msg, index) => (
            <Message key={index} msg={msg} />
          ))}
        </MessagesList>
      </MessageContainer>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
