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

      socket.on('callEnded', () => {
        console.log('Call ended');
        endCall();
      });

      socket.on('message', (newMessage) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        messageRef.current.scrollTop = messageRef.current.scrollHeight;
      });

      socket.on('file', (fileData) => {
        const { fileName, fileContent } = fileData;
        const a = document.createElement('a');
        a.href = fileContent;
        a.download = fileName;
        a.click();
      });

      socket.emit('joinRoom', { room, user: userInfo.name });
      return () => {
        if (socket) {
          socket.emit('leaveRoom', { room, user: userInfo.name });
          socket.close();
        }
      };
    }
  }, [socket, room, userInfo.name, peerConnection]);

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
      }
    };

    newPeerConnection.ontrack = (event) => {
      console.log('Remote stream added.');
      setRemoteStream((prevStream) => {
        const updatedStream = new MediaStream([...prevStream.getTracks(), ...event.streams[0].getTracks()]);
        return updatedStream;
      });
    };

    newPeerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await newPeerConnection.createOffer();
        await newPeerConnection.setLocalDescription(offer);
        socket.emit('videoOffer', { offer, room, caller: userInfo.name });
      } catch (error) {
        console.error('Error during negotiation:', error);
      }
    };

    return newPeerConnection;
  };

  const callUser = async (user) => {
    if (user === userInfo.name) {
      toast.error('You cannot call yourself!');
      return;
    }

    setCallStatus('Calling...');
    const stream = await getLocalStream();
    const newPeerConnection = createPeerConnection();
    setPeerConnection(newPeerConnection);

    stream.getTracks().forEach((track) => newPeerConnection.addTrack(track, stream));
  };

  const answerCall = async () => {
    setIncomingCall(false);
    setCallStatus('Connecting...');
    stopTune();
    const stream = await getLocalStream();
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('videoAnswer', { answer, room });
    setCallStatus('Connected');
  };

  const declineCall = () => {
    setIncomingCall(false);
    setIncomingCallUser('');
    setCallStatus('');
    stopTune();
    socket.emit('callDeclined', { room });
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
    }
    setPeerConnection(null);
    setLocalStream(null);
    setRemoteStream(new MediaStream());
    setCallStatus('');
    setIncomingCall(false);
    setIncomingCallUser('');
    socket.emit('callEnded', { room });
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = { text: message, sender: userInfo.name, room };
      socket.emit('message', newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage('');
    }
  };

  const sendFile = async () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await axios.post('https://connectnow-backend-24july.onrender.com/upload', formData);
        const fileData = { fileName: file.name, fileContent: response.data.fileContent, room };
        socket.emit('file', fileData);
        setFile(null);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  const toggleMute = () => {
    localStream.getAudioTracks()[0].enabled = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = !isVideoOff;
    setIsVideoOff(!isVideoOff);
  };

  const playTune = () => {
    const tune = document.getElementById('tune');
    if (tune) {
      tune.play();
    }
  };

  const stopTune = () => {
    const tune = document.getElementById('tune');
    if (tune) {
      tune.pause();
      tune.currentTime = 0;
    }
  };
  const joinRoom = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    socket.emit('joinRoom', { room });
    console.log('Joined room:', room);
  };
  const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <ChatContainer>
      <audio id="tune" src="/path/to/your/tune.mp3" loop></audio>
      
      <Title>ConnectNow Chat</Title>
      <Button onClick={joinRoom}>Join Room</Button>

      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading ? (
          <ClipLoader color="#007bff" />
        ) : (
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id}>
                {user.name}
                <Button onClick={() => callUser(user.name)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>
      <div>
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling you...</p>
            <Button onClick={answerCall}>Answer</Button>
            <Button onClick={declineCall}>Decline</Button>
          </IncomingCall>
        )}
        <CallStatus connected={callStatus === 'Connected'}>
          {callStatus ? `Status: ${callStatus}` : 'Not in a call'}
        </CallStatus>
        <div>
          <Button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
          <Button onClick={toggleVideo}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
          <Button onClick={endCall}>End Call</Button>
        </div>
        <Video localStream={localStream} remoteStream={remoteStream} />
        <MessageContainer>
          <MessageInput
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows="3"
          />
          <Button onClick={sendMessage}>Send</Button>
          <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
          <Button onClick={sendFile}>Send File</Button>
          <MessagesList ref={messageRef}>
            {messages.map((msg, index) => (
              <Message key={index} text={msg.text} sender={msg.sender} />
            ))}
          </MessagesList>
        </MessageContainer>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
