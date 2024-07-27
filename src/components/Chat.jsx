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
  const [room, setRoom] = useState('ram'); // Default room name "ram"
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
      socket.on('videoOffer', async ({ offer, caller, userToCall }) => {
        if (userToCall === userInfo.name) {
          const newPeerConnection = createPeerConnection();

          newPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('iceCandidate', { candidate: event.candidate, room, target: caller });
            }
          };

          await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));

          const answer = await newPeerConnection.createAnswer();
          await newPeerConnection.setLocalDescription(answer);

          socket.emit('videoAnswer', { answer, room, caller });
          setPeerConnection(newPeerConnection);
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
        console.log('Call rejected');
        endCall();
      });

      socket.on('callDisconnected', () => {
        console.log('Call disconnected');
        endCall();
      });

      socket.on('message', (newMessage) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        if (messageRef.current) {
          messageRef.current.scrollTop = messageRef.current.scrollHeight;
        }
      });

      socket.on('file', (fileData) => {
        const { fileName, fileContent } = fileData;
        const a = document.createElement('a');
        a.href = fileContent;
        a.download = fileName;
        a.click();
      });

      return () => {
        if (socket) {
          socket.close();
        }
      };
    }
  }, [socket, peerConnection]);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [messages]);

  const getLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  };

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    };

    const newPeerConnection = new RTCPeerConnection(configuration);

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { candidate: event.candidate, room });
        console.log('ICE candidate emitted:', event.candidate);
      }
    };

    newPeerConnection.ontrack = (event) => {
      console.log('Remote stream added.');
      setRemoteStream((prevStream) => {
        const newStream = new MediaStream(prevStream);
        newStream.addTrack(event.track);
        return newStream;
      });
    };

    return newPeerConnection;
  };

  const joinRoom = async () => {
    if (room.trim()) {
      socket.emit('joinRoom', { room, user: userInfo.name });
      socket.on('userJoined', ({ user, id }) => {
        console.log(`${user} joined the room. ID: ${id}`);
      });

      const stream = await getLocalStream();
      const newPeerConnection = createPeerConnection();
      stream.getTracks().forEach((track) => newPeerConnection.addTrack(track, stream));

      setPeerConnection(newPeerConnection);
      setCallStatus('Waiting for a call...');

      toast.success(`Joined room: ${room}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleCallUser = async (userToCall) => {
    if (peerConnection && socket) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('videoOffer', { offer, room, userToCall, caller: userInfo.name });
      setCallStatus(`Calling ${userToCall}...`);
    }
  };

  const handleAnswerCall = async () => {
    if (peerConnection && socket) {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('videoAnswer', { answer, room, caller: incomingCallUser });
      setCallStatus(`In call with ${incomingCallUser}`);
    }
  };

  const handleRejectCall = () => {
    if (socket) {
      socket.emit('callRejected', { room, caller: incomingCallUser });
      setIncomingCall(false);
      setIncomingCallUser('');
      setCallStatus('');
    }
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
      setCallStatus('');
    }
  };

  const handleSendMessage = () => {
    if (socket && message.trim()) {
      const newMessage = { user: userInfo.name, text: message };
      socket.emit('message', { message: newMessage, room });
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage('');
    }
  };

  const handleSendFile = async () => {
    if (socket && file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileContent = reader.result;
        const fileName = file.name;
        socket.emit('file', { room, fileName, fileContent });
      };
      reader.readAsDataURL(file);
      setFile(null);
    }
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

  return (
    <ChatContainer>
      <Title>Video Chat Application</Title>
      <Button onClick={joinRoom}>Join Room</Button>
      {callStatus && <CallStatus connected={callStatus.includes('In call')}>{callStatus}</CallStatus>}
      <Video localStream={localStream} remoteStream={remoteStream} />
      <div>
        {incomingCall && (
          <IncomingCall>
            <p>{`${incomingCallUser} is calling you...`}</p>
            <Button onClick={handleAnswerCall}>Answer</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <UserListContainer>
          <SearchInput
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {loading ? (
            <ClipLoader size={150} color={"#123abc"} loading={loading} />
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
        </UserListContainer>
      </div>
      <MessageContainer>
        <MessageInput
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <Button onClick={handleSendMessage}>Send Message</Button>
        <MessagesList ref={messageRef}>
          {messages.map((msg, index) => (
            <Message key={index} user={msg.user} text={msg.text} />
          ))}
        </MessagesList>
        <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
        <Button onClick={handleSendFile}>Send File</Button>
      </MessageContainer>
      <div>
        <Button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={toggleVideo}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
