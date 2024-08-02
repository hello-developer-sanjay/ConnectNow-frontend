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
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerConnections, setPeerConnections] = useState({});
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

    newSocket.emit('joinRoom', { room: 'commonroom', user: userInfo.name });

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

        if (userToCall === userInfo.name) {
          setIncomingCall(true);
          setIncomingCallUser(caller);
          setOffer(offer);
          setCallStatus(`Incoming call from ${caller}`);
        }
      });

      socket.on('videoAnswer', async ({ answer, caller }) => {
        console.log('Received video answer:', answer);
        toast.info('Received video answer');

        if (peerConnections[caller] && peerConnections[caller].signalingState === 'have-local-offer') {
          try {
            await peerConnections[caller].setRemoteDescription(new RTCSessionDescription(answer));
            setCallStatus(`In call with ${incomingCallUser}`);
          } catch (error) {
            console.error('Error setting remote description for answer:', error);
          }
        } else {
          console.error('Peer connection is not in the expected state for setting remote answer');
        }
      });

      socket.on('newIceCandidate', async ({ candidate, from }) => {
        console.log('Received new ICE candidate:', candidate);
        toast.info('Received new ICE candidate');

        if (peerConnections[from]) {
          try {
            await peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('Error adding received ICE candidate:', error);
          }
        }
      });

      socket.on('user-disconnected', ({ userId }) => {
        console.log('User disconnected');
        toast.info('User disconnected');
        handleCallEnd(userId);
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
  }, [socket, userInfo, peerConnections, incomingCallUser]);

  const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socket.emit('newIceCandidate', { candidate: event.candidate, to: userId });
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track added:', event.streams[0]);
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [userId]: event.streams[0],
      }));
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        console.log('ICE connection disconnected');
        handleCallEnd(userId);
      }
    };

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    return pc;
  };

  const handleCallUser = async (userToCall) => {
    setCallStatus(`Calling ${userToCall}...`);
    const pc = createPeerConnection(userToCall);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('videoOffer', { offer, userToCall, caller: userInfo.name });

      setPeerConnections((prevConnections) => ({
        ...prevConnections,
        [userToCall]: pc,
      }));
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Error creating offer.');
    }
  };

  const handleAnswerCall = async () => {
    setIncomingCall(false);
    const pc = createPeerConnection(incomingCallUser);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Wait for the local description to be set before sending the answer
      pc.onnegotiationneeded = async () => {
        if (pc.signalingState === 'have-remote-offer') {
          socket.emit('videoAnswer', { answer: pc.localDescription, caller: incomingCallUser });

          setPeerConnections((prevConnections) => ({
            ...prevConnections,
            [incomingCallUser]: pc,
          }));
          setCallStatus(`In call with ${incomingCallUser}`);
        }
      };
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Error answering call.');
    }
  };

  const handleRejectCall = () => {
    setIncomingCall(false);
    setIncomingCallUser('');
    setCallStatus('Call rejected');
  };

  const handleCallEnd = (userId) => {
    if (peerConnections[userId]) {
      peerConnections[userId].close();
      delete peerConnections[userId];
      setPeerConnections((prevConnections) => ({
        ...prevConnections,
      }));
      setRemoteStreams((prevStreams) => {
        const { [userId]: _, ...rest } = prevStreams;
        return rest;
      });
      setCallStatus('');
      setIncomingCall(false);
      setIncomingCallUser('');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      const newMessage = { sender: userInfo.name, content: message };
      socket.emit('message', newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage('');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const fileUrl = response.data.fileUrl;
        const fileMessage = { sender: userInfo.name, fileUrl, fileName: file.name };
        socket.emit('fileMessage', fileMessage);
        setMessages((prevMessages) => [...prevMessages, fileMessage]);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Error uploading file.');
      }
    }
  };

  const handleMuteToggle = () => {
    localStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsMuted((prev) => !prev);
  };

  const handleVideoToggle = () => {
    localStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsVideoOff((prev) => !prev);
  };

  return (
    <ChatContainer>
      <Title>ConnectNow</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <UserList>
          {loading ? (
            <ClipLoader size={150} />
          ) : (
            filteredUsers.map((user) => (
              <UserItem key={user.id}>
                <p>{user.name}</p>
                <Button onClick={() => handleCallUser(user.name)}>Call</Button>
              </UserItem>
            ))
          )}
        </UserList>
      </UserListContainer>
      <div>
        <Video
          localStream={localStream}
          remoteStreams={Object.values(remoteStreams)}
        />
        <Button onClick={handleMuteToggle}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleVideoToggle}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
        <Button onClick={() => handleCallEnd(incomingCallUser)}>End Call</Button>
        <CallStatus connected={!!callStatus}>{callStatus}</CallStatus>
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling...</p>
            <Button onClick={handleAnswerCall}>Answer</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
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
          <Button onClick={handleSendMessage}>Send</Button>
          <FileInput type="file" onChange={handleFileUpload} />
        </MessageContainer>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
