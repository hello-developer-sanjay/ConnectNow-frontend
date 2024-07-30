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
  const [room, setRoom] = useState('common'); // Default room name "common"
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
            const [remoteStreamTrack] = event.streams;
            setRemoteStream(remoteStreamTrack);
          };

          await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          setPeerConnection(newPeerConnection);
          setOffer(offer);
          setIncomingCall(true);
          setIncomingCallUser(caller);
        }
      });

      socket.on('videoAnswer', async ({ answer }) => {
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          setCallStatus('Call connected');
        }
      });

      socket.on('iceCandidate', async ({ candidate }) => {
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on('callRejected', () => {
        setCallStatus('Call rejected');
      });

      socket.on('callDisconnected', () => {
        endCall();
        setCallStatus('Call ended');
      });

      socket.on('message', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      socket.on('file', ({ fileName, fileContent }) => {
        handleFileReceive(fileName, fileContent);
      });
    }
  }, [socket, peerConnection]);

  const createPeerConnection = () => {
    const newPeerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (localStream) {
      localStream.getTracks().forEach((track) => newPeerConnection.addTrack(track, localStream));
    }

    return newPeerConnection;
  };

  const startCall = async (userToCall) => {
    const newPeerConnection = createPeerConnection();

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { candidate: event.candidate, room });
      }
    };

    newPeerConnection.ontrack = (event) => {
      const [remoteStreamTrack] = event.streams;
      setRemoteStream(remoteStreamTrack);
    };

    const offer = await newPeerConnection.createOffer();
    await newPeerConnection.setLocalDescription(offer);

    socket.emit('videoOffer', { offer, room, userToCall, caller: userInfo.name });
    setPeerConnection(newPeerConnection);
    setCallStatus(`Calling ${userToCall}...`);
  };

  const answerCall = async () => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('videoAnswer', { answer, caller: incomingCallUser, room });
    setCallStatus('Call connected');
    setIncomingCall(false);
  };

  const rejectCall = () => {
    socket.emit('callRejected', { room, caller: incomingCallUser });
    setCallStatus('Call rejected');
    setIncomingCall(false);
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
    }
    setCallStatus('Call ended');
    socket.emit('callDisconnected', { room });
  };

  const handleFileUpload = async () => {
    if (file) {
      const fileContent = await file.text();
      socket.emit('file', { fileName: file.name, fileContent, room });
    }
  };

  const handleFileReceive = (fileName, fileContent) => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('message', { text: message, room });
      setMessage('');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
      })
      .catch((err) => console.error('Error accessing media devices.', err));
  }, []);

  return (
    <ChatContainer>
      <div>
        <Title>Video Chat</Title>
        <UserListContainer>
          <SearchInput
            type="text"
            placeholder="Search for users..."
            value={searchTerm}
            onChange={handleSearch}
          />
          {loading ? (
            <ClipLoader color="#007bff" size={50} />
          ) : (
            <UserList>
              {users.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
                <UserItem key={user.name}>
                  <h3>{user.name}</h3>
                  <Button onClick={() => startCall(user.name)}>Call</Button>
                </UserItem>
              ))}
            </UserList>
          )}
        </UserListContainer>
      </div>

      <div>
        <Video localStream={localStream} remoteStream={remoteStream} />
        <Button onClick={endCall}>End Call</Button>
        {incomingCall && (
          <IncomingCall>
            <h2>Incoming call from {incomingCallUser}</h2>
            <Button onClick={answerCall}>Answer</Button>
            <Button onClick={rejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <CallStatus connected={callStatus === 'Call connected'}>{callStatus}</CallStatus>
      </div>

      <div>
        <MessageContainer>
          <MessagesList ref={messageRef}>
            {messages.map((msg, index) => (
              <Message key={index} message={msg} />
            ))}
          </MessagesList>
          <MessageInput
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <Button onClick={sendMessage}>Send</Button>
          <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
          <Button onClick={handleFileUpload}>Upload File</Button>
        </MessageContainer>
      </div>

      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
