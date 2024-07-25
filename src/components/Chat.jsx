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
      ],
    });

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { room, candidate: event.candidate });
      }
    };

    newPeerConnection.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

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
  };

  const acceptCall = async () => {
    if (!peerConnection) {
      console.error('No peer connection available');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
    socket.emit('videoAnswer', { room, answer });
    setIncomingCall(false);
  };

  const rejectCall = () => {
    console.log('Rejecting call from user:', incomingCallUser);
    socket.emit('callRejected', { room, userId: incomingCallUser });
    setIncomingCall(false);
    setCallStatus('Call rejected');
  };

  const joinRoom = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      console.log('Joined room and got local stream:', stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Error accessing media devices. Please ensure you have given permission.');
    }
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
    setCallStatus('');
    setIncomingCall(false);
    setIncomingCallUser('');
    socket.emit('leaveRoom', { room });
    toast.info('You have left the room.');
  };

  const sendMessage = () => {
    if (message.trim() !== '') {
      const newMessage = {
        sender: userInfo.name,
        content: message,
        timestamp: new Date(),
      };
      socket.emit('sendMessage', { room, message: newMessage });
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage('');
      scrollToBottom();
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
  };

  const sendFile = async () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await axios.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        const fileUrl = response.data.fileUrl;
        const newMessage = {
          sender: userInfo.name,
          content: `<a href="${fileUrl}" target="_blank">Download File</a>`,
          timestamp: new Date(),
        };
        socket.emit('sendMessage', { room, message: newMessage });
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setFile(null);
        toast.success('File sent successfully.');
        scrollToBottom();
      } catch (error) {
        console.error('Error sending file:', error);
        toast.error('Error sending file. Please try again.');
      }
    }
  };

  const scrollToBottom = () => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const resetCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setRemoteStream(null);
    setCallStatus('');
    setIncomingCall(false);
    setIncomingCallUser('');
  };

  return (
    <ChatContainer>
      <Title>Welcome to the Video Chat Room</Title>
      <div>
        <Button onClick={joinRoom}>Join Room</Button>
        <Button onClick={leaveRoom}>Leave Room</Button>
        <Button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={toggleVideo}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
        <CallStatus connected={callStatus === 'Connected'}>{callStatus}</CallStatus>
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling you...</p>
            <Button onClick={acceptCall}>Accept</Button>
            <Button onClick={rejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <div>
          <Video stream={localStream} muted />
          <Video stream={remoteStream} />
        </div>
      </div>
      <div>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {loading ? (
          <ClipLoader size={50} color={"#123abc"} loading={loading} />
        ) : (
          <UserListContainer>
            <UserList>
              {filteredUsers.map((user) => (
                <UserItem key={user._id}>
                  <p>{user.name}</p>
                  <Button onClick={() => startCall(user._id)}>Call</Button>
                </UserItem>
              ))}
            </UserList>
          </UserListContainer>
        )}
      </div>
      <MessageContainer>
        <MessageInput
          rows="4"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button onClick={sendMessage}>Send Message</Button>
        <MessagesList ref={messageRef}>
          {messages.map((msg, index) => (
            <Message key={index} message={msg} />
          ))}
        </MessagesList>
        <FileInput type="file" onChange={handleFileChange} />
        <Button onClick={sendFile}>Send File</Button>
      </MessageContainer>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
