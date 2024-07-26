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
        setCallStatus('Call rejected by the user');
        setIncomingCall(false);
      });

      socket.on('callEnded', () => {
        setCallStatus('Call ended');
        endCall();
      });
    }
  }, [socket, peerConnection]);

  const handleUserItemClick = async (userId) => {
    console.log('Calling user:', userId);
    const newPeerConnection = createPeerConnection();
    setPeerConnection(newPeerConnection);

    const localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(localMediaStream);
    localMediaStream.getTracks().forEach((track) => newPeerConnection.addTrack(track, localMediaStream));

    newPeerConnection.ontrack = (event) => {
      setRemoteStream((prevStream) => {
        const newStream = new MediaStream([...prevStream.getTracks(), event.track]);
        return newStream;
      });
    };

    const offer = await newPeerConnection.createOffer();
    await newPeerConnection.setLocalDescription(offer);
    socket.emit('videoOffer', { offer, callee: userId });
    setCallStatus('Calling...');
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
        socket.emit('iceCandidate', { candidate: event.candidate });
      }
    };

    newPeerConnection.ontrack = (event) => {
      const remoteStream = new MediaStream();
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      setRemoteStream(remoteStream);
    };

    return newPeerConnection;
  };

  const answerCall = async () => {
    if (!peerConnection) {
      console.log('No peer connection available to answer call');
      return;
    }

    const localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(localMediaStream);
    localMediaStream.getTracks().forEach((track) => peerConnection.addTrack(track, localMediaStream));

    peerConnection.ontrack = (event) => {
      setRemoteStream((prevStream) => {
        const newStream = new MediaStream([...prevStream.getTracks(), event.track]);
        return newStream;
      });
    };

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('videoAnswer', { answer, caller: incomingCallUser });
    setCallStatus('Connected');
    setIncomingCall(false);
  };

  const rejectCall = () => {
    socket.emit('callRejected', { caller: incomingCallUser });
    setCallStatus('Call rejected');
    setIncomingCall(false);
  };

  const endCall = () => {
    peerConnection.close();
    setPeerConnection(null);
    setRemoteStream(new MediaStream());
    setCallStatus('');
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    socket.emit('endCall', { userId: incomingCallUser });
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      const newMessage = { text: message, sender: userInfo._id, room };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage('');
      socket.emit('sendMessage', newMessage);
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on('receiveMessage', (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    }
  }, [socket]);
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
      <ToastContainer />
      <Title>Video Chat Application</Title>
      <Button onClick={joinRoom}>Join Room</Button>
      <Button onClick={leaveRoom}>Leave Room</Button>
      
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading ? (
          <ClipLoader color="#007bff" loading={loading} size={50} />
        ) : (
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id} onClick={() => handleUserItemClick(user._id)}>
                <p>{user.name}</p>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>
      <div>
        {incomingCall && (
          <IncomingCall>
            <p>Incoming call from {incomingCallUser}</p>
            <Button onClick={answerCall}>Answer</Button>
            <Button onClick={rejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <CallStatus connected={callStatus === 'Connected'}>
          {callStatus ? callStatus : 'No active call'}
        </CallStatus>
        <Video
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          toggleMute={toggleMute}
          isVideoOff={isVideoOff}
          toggleVideo={toggleVideo}
        />
        <MessageContainer>
          <MessageInput
            rows="4"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button onClick={handleSendMessage}>Send Message</Button>
          <MessagesList ref={messageRef}>
            {messages.map((msg, index) => (
              <Message key={index} message={msg} />
            ))}
          </MessagesList>
          <FileInput
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </MessageContainer>
      </div>
    </ChatContainer>
  );
};

export default Chat;
