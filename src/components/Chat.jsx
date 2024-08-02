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
  const iceCandidatesQueue = useRef([]);

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

    if (userInfo) {
      newSocket.emit('joinRoom', { room: 'commonroom', user: userInfo.name });
    }

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

        if (userToCall === userInfo?.name) {
          setIncomingCall(true);
          setIncomingCallUser(caller);
          setOffer(offer);
          setCallStatus(`Incoming call from ${caller}`);
        }
      });

      socket.on('videoAnswer', async ({ answer, caller }) => {
        console.log('Received video answer:', answer);
        toast.info('Received video answer');
    
        if (peerConnection && peerConnection.signalingState !== 'stable') {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log('Remote description set successfully');
                setCallStatus(`In call with ${incomingCallUser}`);
            } catch (error) {
                console.error('Error setting remote description for answer:', error);
            }
        } else {
            console.warn('No peer connection or peer connection is in a stable state');
        }
    });
    
      socket.on('newIceCandidate', async ({ candidate }) => {
        console.log('Received new ICE candidate:', candidate);
        toast.info('Received new ICE candidate');
    
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('Added ICE candidate successfully');
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        } else {
            console.warn('No peer connection available');
        }
    });
    

      socket.on('user-disconnected', () => {
        console.log('User disconnected');
        toast.info('User disconnected');
        handleCallEnd();
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
  }, [socket, userInfo, peerConnection, room]);

  const processQueuedIceCandidates = async () => {
    console.log('Processing queued ICE candidates:', iceCandidatesQueue.current);
    for (const candidate of iceCandidatesQueue.current) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding queued ICE candidate:', error);
      }
    }
    iceCandidatesQueue.current = [];
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            socket.emit('newIceCandidate', { candidate: event.candidate, room });
        }
    };

    pc.ontrack = (event) => {
        console.log('Received remote track:', event.track);
        const remoteStream = event.streams[0];
        if (remoteStream.getAudioTracks().length > 0) {
            console.log('Remote audio track found.');
        } else {
            console.warn('No remote audio track found.');
        }
        setRemoteStream(remoteStream);
    };

    pc.onnegotiationneeded = async () => {
        console.log('Negotiation needed');
    };

    if (localStream) {
        localStream.getTracks().forEach((track) => {
            // Add a check here
            if (!pc.getSenders().some(sender => sender.track.id === track.id)) {
                console.log('Adding track:', track);
                pc.addTrack(track, localStream);
            }
        });
    }

    setPeerConnection(pc);

    return pc;
};



const handleCall = async (userToCall) => {
  if (!localStream) {
      toast.error('Local stream not available.');
      return;
  }

  // Check if there is already an active peer connection
  if (peerConnection) {
      console.warn('Already in a call');
      return; // Prevent multiple calls
  }

  const pc = createPeerConnection();
  setPeerConnection(pc);

  // Ensure you only add tracks if they haven't been added already
  localStream.getTracks().forEach((track) => {
      if (!pc.getSenders().some(sender => sender.track.id === track.id)) {
          console.log('Adding local track to peer connection:', track);
          pc.addTrack(track, localStream);
      }
  });

  try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('videoOffer', {
          offer,
          caller: userInfo.name,
          userToCall,
          room,
      });
      setCallStatus(`Calling ${userToCall}...`);
  } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Error creating offer.');
  }
};



const handleAnswerCall = async () => {
  if (!localStream) {
      toast.error('Local stream not available.');
      return;
  }

  const pc = createPeerConnection();
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('videoAnswer', { answer, room });
      setCallStatus(`In call with ${incomingCallUser}`);
      setIncomingCall(false);
      processQueuedIceCandidates();
  } catch (error) {
      console.error('Error creating answer:', error);
      toast.error('Error creating answer.');
  }
};


  const handleRejectCall = () => {
    setIncomingCall(false);
    setCallStatus('');
    setOffer(null);
  };

  const handleCallEnd = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(new MediaStream());
      setCallStatus('');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        user: userInfo.name,
        text: message,
        timestamp: new Date().toISOString(),
      };
      socket.emit('message', newMessage);
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', userInfo.name);
    formData.append('room', room);

    try {
      const { data } = await axios.post('https://connectnow-backend-24july.onrender.com/upload', formData);
      socket.emit('fileMessage', {
        fileUrl: data.fileUrl,
        user: userInfo.name,
        timestamp: new Date().toISOString(),
      });
      setFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error uploading file.');
    }
  };

  const handleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('Mute status:', !audioTrack.enabled);
      }
    }
  };

  const handleVideoToggle = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        console.log('Video status:', !videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ChatContainer>
      <Title>Video Chat App</Title>
      <ToastContainer />

      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {loading ? (
          <ClipLoader size={50} color="#123abc" loading={loading} />
        ) : (
          <UserList>
            {filteredUsers.map((user) => (
              <UserItem key={user._id}>
                <p>{user.name}</p>
                <Button onClick={() => handleCall(user.name)}>Call</Button>
              </UserItem>
            ))}
          </UserList>
        )}
      </UserListContainer>

      <div>
        <CallStatus connected={!!callStatus}>{callStatus}</CallStatus>

        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling...</p>
            <Button onClick={handleAnswerCall}>Answer</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}

        {localStream && (
          <Video stream={localStream} isLocal muted={isMuted} isVideoOff={isVideoOff} />
        )}

        {remoteStream && remoteStream.getTracks().length > 0 && (
          <Video stream={remoteStream} />
        )}

        <Button onClick={handleCallEnd}>End Call</Button>
        <Button onClick={handleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleVideoToggle}>
          {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
        </Button>
      </div>

      <MessageContainer>
        <MessageInput
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button onClick={sendMessage}>Send</Button>

        <FileInput
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <Button onClick={handleFileUpload}>Upload</Button>

        <MessagesList ref={messageRef}>
          {messages.map((msg, index) => (
            <Message key={index} message={msg} />
          ))}
        </MessagesList>
      </MessageContainer>
    </ChatContainer>
  );
};

export default Chat;
