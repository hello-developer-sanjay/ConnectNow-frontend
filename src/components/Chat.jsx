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
  const [remoteStreams, setRemoteStreams] = useState([]);
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

      socket.on('videoAnswer', async ({ answer }) => {
        console.log('Received video answer:', answer);
        toast.info('Received video answer');

        const peerConnection = peerConnections[incomingCallUser];
        if (peerConnection && peerConnection.signalingState !== 'stable') {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            setCallStatus(`In call with ${incomingCallUser}`);
          } catch (error) {
            console.error('Error setting remote description for answer:', error);
          }
        } else {
          console.error('No peer connection or peer connection is in a stable state');
        }
      });

      socket.on('newIceCandidate', async ({ candidate, userToCall }) => {
        console.log('Received new ICE candidate:', candidate);
        toast.info('Received new ICE candidate');

        const peerConnection = peerConnections[userToCall];
        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('Error adding received ICE candidate:', error);
          }
        }
      });

      socket.on('user-disconnected', (disconnectedUser) => {
        console.log(`${disconnectedUser} disconnected`);
        toast.info(`${disconnectedUser} disconnected`);
        handleCallEnd(disconnectedUser);
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
  }, [socket, peerConnections]);

  const initiateCall = async (userToCall) => {
    if (!localStream) {
      console.error('Local stream is not available.');
      return;
    }

    setCallStatus(`Calling ${userToCall}...`);

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socket.emit('newIceCandidate', {
          candidate: event.candidate,
          userToCall,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('Remote track added:', event.streams[0]);
      setRemoteStreams((prevStreams) => [
        ...prevStreams,
        { user: userToCall, stream: event.streams[0] },
      ]);
    };

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    setPeerConnections((prevConnections) => ({
      ...prevConnections,
      [userToCall]: peerConnection,
    }));

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('videoOffer', {
        offer: peerConnection.localDescription,
        userToCall,
        caller: userInfo.name,
      });
      console.log('Video offer sent:', offer);
    } catch (error) {
      console.error('Error creating and sending offer:', error);
    }
  };

  const handleAnswer = async () => {
    if (!offer) {
      console.error('No offer to answer.');
      return;
    }

    if (!localStream) {
      console.error('Local stream is not available.');
      return;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socket.emit('newIceCandidate', {
          candidate: event.candidate,
          userToCall: incomingCallUser,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('Remote track added:', event.streams[0]);
      setRemoteStreams((prevStreams) => [
        ...prevStreams,
        { user: incomingCallUser, stream: event.streams[0] },
      ]);
    };

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    setPeerConnections((prevConnections) => ({
      ...prevConnections,
      [incomingCallUser]: peerConnection,
    }));

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('videoAnswer', {
        answer: peerConnection.localDescription,
        userToCall: incomingCallUser,
      });
      console.log('Video answer sent:', answer);
      setCallStatus(`In call with ${incomingCallUser}`);
      setIncomingCall(false);
    } catch (error) {
      console.error('Error setting remote description and creating answer:', error);
    }
  };

  const handleReject = () => {
    setIncomingCall(false);
    setCallStatus('Call rejected');
  };

  const handleCallEnd = (userToCall) => {
    const peerConnection = peerConnections[userToCall];
    if (peerConnection) {
      peerConnection.close();
      setPeerConnections((prevConnections) => {
        const updatedConnections = { ...prevConnections };
        delete updatedConnections[userToCall];
        return updatedConnections;
      });
      setRemoteStreams((prevStreams) =>
        prevStreams.filter((stream) => stream.user !== userToCall)
      );
    }
    setCallStatus('');
  };

  const handleMute = () => {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  const handleVideoOff = () => {
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(!isVideoOff);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit('message', { user: userInfo.name, text: message });
      setMessages((prevMessages) => [...prevMessages, { user: userInfo.name, text: message }]);
      setMessage('');
    }
  };

  const handleSendFile = async () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const { data } = await axios.post('/api/upload', formData);
        socket.emit('message', { user: userInfo.name, text: `File: ${data}` });
        setMessages((prevMessages) => [...prevMessages, { user: userInfo.name, text: `File: ${data}` }]);
        setFile(null);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error('Error uploading file.');
      }
    }
  };

  return (
    <ChatContainer>
      <Title>ConnectNow Video Call</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {loading ? (
          <ClipLoader size={50} color={'#123abc'} loading={loading} />
        ) : (
          <UserList>
            {users
              .filter((user) =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((user) => (
                <UserItem key={user._id}>
                  <p>{user.name}</p>
                  <Button onClick={() => initiateCall(user.name)}>Call</Button>
                </UserItem>
              ))}
          </UserList>
        )}
      </UserListContainer>
      <div>
        <Video
          localStream={localStream}
          remoteStreams={remoteStreams}
          handleCallEnd={handleCallEnd}
        />
        <CallStatus connected={callStatus.includes('In call')}>{callStatus}</CallStatus>
        {incomingCall && (
          <IncomingCall>
            <p>Incoming call from {incomingCallUser}</p>
            <Button onClick={handleAnswer}>Answer</Button>
            <Button onClick={handleReject}>Reject</Button>
          </IncomingCall>
        )}
        <Button onClick={handleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleVideoOff}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
        <MessageContainer>
          <MessageInput
            value={message}
            onChange={handleMessageChange}
            placeholder="Type a message..."
          />
          <Button onClick={handleSendMessage}>Send</Button>
          <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
          <Button onClick={handleSendFile}>Send File</Button>
          <MessagesList>
            {messages.map((msg, index) => (
              <Message key={index} user={msg.user} text={msg.text} />
            ))}
          </MessagesList>
        </MessageContainer>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
