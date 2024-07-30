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
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
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

    socket.emit('videoAnswer', { answer, caller: incomingCallUser });
    setCallStatus('Call connected');
    setIncomingCall(false);
  };

  const rejectCall = () => {
    socket.emit('callRejected', { caller: incomingCallUser });
    setIncomingCall(false);
    setCallStatus('Call rejected');
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
    }

    socket.emit('callDisconnected', { room });
    setCallStatus('Call ended');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendMessage = () => {
    if (message.trim() !== '') {
      socket.emit('message', { room, sender: userInfo.name, text: message });
      setMessage('');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const sendFile = async () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = reader.result;
        socket.emit('file', { room, sender: userInfo.name, fileName: file.name, fileContent });
        setFile(null);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileReceive = (fileName, fileContent) => {
    const blob = new Blob([fileContent]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.info(`${fileName} received`);
  };

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

  const joinRoom = () => {
    socket.emit('joinRoom', { room, user: userInfo.name });
    setCallStatus(`Joined room: ${room}`);
  };

  return (
    <ChatContainer>
      <Title>Video Chat Application</Title>
      <SearchInput
        type="text"
        placeholder="Search for users..."
        value={searchTerm}
        onChange={handleSearchChange}
      />
      <Button onClick={joinRoom}>Join Room</Button>
      <CallStatus connected={callStatus.includes('connected')}>{callStatus}</CallStatus>
      {incomingCall && (
        <IncomingCall>
          <p>{incomingCallUser} is calling...</p>
          <Button onClick={answerCall}>Answer</Button>
          <Button onClick={rejectCall}>Reject</Button>
        </IncomingCall>
      )}
      <UserListContainer>
        {loading ? (
          <ClipLoader size={50} />
        ) : (
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id}>
                <p>{user.name}</p>
                <Button onClick={() => startCall(user.name)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>
      <MessageContainer>
        <MessagesList>
          {messages.map((msg, index) => (
            <Message key={index} sender={msg.sender} text={msg.text} />
          ))}
          <div ref={messageRef}></div>
        </MessagesList>
        <MessageInput
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button onClick={sendMessage}>Send Message</Button>
        <FileInput type="file" onChange={handleFileChange} />
        <Button onClick={sendFile}>Send File</Button>
      </MessageContainer>
      <Button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
      <Button onClick={toggleVideo}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
      <Video localStream={localStream} remoteStream={remoteStream} />
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
