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

const RoomInput = styled.input`
  width: 100%;
  max-width: 300px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState('common'); // Default room name "common"
  const [roomName, setRoomName] = useState('');
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
    console.log('Socket connection established:', newSocket.id);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('videoOffer', async ({ offer, caller, userToCall }) => {
        if (userToCall === userInfo.name) {
          const newPeerConnection = createPeerConnection();

          newPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('iceCandidate', { candidate: event.candidate, room });
            }
          };

          newPeerConnection.ontrack = (event) => {
            setRemoteStream((prevStream) => {
              prevStream.addTrack(event.track);
              return prevStream;
            });
          };

          await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await newPeerConnection.createAnswer();
          await newPeerConnection.setLocalDescription(answer);

          socket.emit('videoAnswer', { answer, caller });

          setPeerConnection(newPeerConnection);
          setCallStatus(`Incoming call from ${caller}`);
          setIncomingCall(true);
          setIncomingCallUser(caller);
        }
      });

      socket.on('videoAnswer', async ({ answer }) => {
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on('iceCandidate', async ({ candidate }) => {
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on('callRejected', () => {
        setCallStatus('Call rejected');
        setTimeout(() => {
          setCallStatus('');
        }, 3000);
      });

      socket.on('callDisconnected', () => {
        setCallStatus('Call disconnected');
        setTimeout(() => {
          setCallStatus('');
        }, 3000);
        if (peerConnection) {
          peerConnection.close();
          setPeerConnection(null);
          setRemoteStream(new MediaStream());
        }
      });

      socket.on('message', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
        messageRef.current?.scrollIntoView({ behavior: 'smooth' });
      });

      socket.on('file', ({ fileName, fileContent }) => {
        const link = document.createElement('a');
        link.href = fileContent;
        link.download = fileName;
        link.click();
      });
    }
  }, [socket, userInfo, peerConnection, room]);

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };
    return new RTCPeerConnection(configuration);
  };

  const startCall = async (userToCall) => {
    const newPeerConnection = createPeerConnection();

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { candidate: event.candidate, room });
      }
    };

    newPeerConnection.ontrack = (event) => {
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

    socket.emit('videoOffer', { offer, room, userToCall, caller: userInfo.name });
    setPeerConnection(newPeerConnection);
  };

  const handleAnswerCall = async () => {
    if (offer && peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('videoAnswer', { answer, caller: incomingCallUser });
      setCallStatus('In call');
      setIncomingCall(false);
    }
  };

  const handleRejectCall = () => {
    socket.emit('callRejected', { caller: incomingCallUser });
    setIncomingCall(false);
  };

  const handleDisconnect = () => {
    socket.emit('callDisconnected', { room });
    setCallStatus('Call disconnected');
    setTimeout(() => {
      setCallStatus('');
    }, 3000);
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    const newMessage = { user: userInfo.name, text: message };
    socket.emit('message', { message: newMessage, room });
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setMessage('');
    messageRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = reader.result;
        socket.emit('file', { room, fileName: file.name, fileContent });
        setFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    localStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
  };

  const handleVideoToggle = () => {
    setIsVideoOff(!isVideoOff);
    localStream.getVideoTracks().forEach((track) => (track.enabled = !isVideoOff));
  };

  const joinRoom = () => {
    if (roomName.trim()) {
      setRoom(roomName.trim());
      socket.emit('joinRoom', { room: roomName.trim(), user: userInfo.name });
      setRoomName('');
    } else {
      toast.error('Please enter a valid room name');
    }
  };

  return (
    <ChatContainer>
      <Title>Chat Room</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <UserList>
          {loading ? (
            <ClipLoader size={50} color="#007bff" />
          ) : (
            filteredUsers.map((user) => (
              <UserItem key={user.id}>
                {user.name}
                <Button onClick={() => startCall(user.name)}>Call</Button>
              </UserItem>
            ))
          )}
        </UserList>
      </UserListContainer>
      <div>
        <div>
          <RoomInput
            type="text"
            placeholder="Enter room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <Button onClick={joinRoom}>Join Room</Button>
        </div>
        <div>
          <Video stream={localStream} muted={true} />
          <Video stream={remoteStream} muted={false} />
        </div>
        {incomingCall && (
          <IncomingCall>
            <p>Incoming call from {incomingCallUser}</p>
            <Button onClick={handleAnswerCall}>Answer</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <CallStatus connected={callStatus === 'In call'}>
          {callStatus}
        </CallStatus>
        <div>
          <Button onClick={handleMuteToggle}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
          <Button onClick={handleVideoToggle}>
            {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
          </Button>
          <Button onClick={handleDisconnect}>Disconnect</Button>
        </div>
        <MessageContainer>
          <MessagesList>
            {messages.map((msg, index) => (
              <Message key={index} message={msg} />
            ))}
            <div ref={messageRef}></div>
          </MessagesList>
          <MessageInput
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button onClick={handleSendMessage}>Send Message</Button>
          <FileInput type="file" onChange={handleFileChange} />
        </MessageContainer>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
