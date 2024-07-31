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
  const [iceCandidateBuffer, setIceCandidateBuffer] = useState([]);
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

    // Automatically join the room
    newSocket.emit('joinRoom', { room: 'commonroom', user: userInfo.name });

    return () => newSocket.close();
  }, [userInfo]);

  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
      } catch (error) {
        console.error('Error accessing media devices.', error);
      }
    };

    initLocalStream();
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
              const newStream = new MediaStream(prevStream);
              event.streams[0].getTracks().forEach((track) => {
                newStream.addTrack(track);
              });
              return newStream;
            });
          };

          try {
            await newPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            setPeerConnection(newPeerConnection);
            setOffer(offer);
            setIncomingCall(true);
            setIncomingCallUser(caller);
            // Flush the ICE candidate buffer
            iceCandidateBuffer.forEach(async (candidate) => {
              await newPeerConnection.addIceCandidate(candidate);
            });
            setIceCandidateBuffer([]);
          } catch (error) {
            console.error('Error setting remote description.', error);
          }
        }
      });

      socket.on('videoAnswer', async ({ answer }) => {
        if (peerConnection) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            setCallStatus('Call connected');
          } catch (error) {
            console.error('Error setting remote description on answer.', error);
          }
        }
      });

      socket.on('iceCandidate', async ({ candidate }) => {
        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('Error adding ICE candidate.', error);
          }
        } else {
          // Buffer the ICE candidates until the peer connection is established
          setIceCandidateBuffer((prevBuffer) => [...prevBuffer, candidate]);
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
    const configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    };
    const newPeerConnection = new RTCPeerConnection(configuration);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        newPeerConnection.addTrack(track, localStream);
      });
    }

    return newPeerConnection;
  };

  const handleCall = async (user) => {
    const newPeerConnection = createPeerConnection();

    newPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { candidate: event.candidate, room });
      }
    };

    newPeerConnection.ontrack = (event) => {
      setRemoteStream((prevStream) => {
        const newStream = new MediaStream(prevStream);
        event.streams[0].getTracks().forEach((track) => {
          newStream.addTrack(track);
        });
        return newStream;
      });
    };

    try {
      const offer = await newPeerConnection.createOffer();
      await newPeerConnection.setLocalDescription(offer);

      socket.emit('videoOffer', { offer, caller: userInfo.name, userToCall: user });
      setPeerConnection(newPeerConnection);
      setCallStatus('Calling');
    } catch (error) {
      console.error('Error creating offer.', error);
    }
  };

  const handleAcceptCall = async () => {
    if (peerConnection && offer) {
      try {
        await peerConnection.setLocalDescription(await peerConnection.createAnswer());
        socket.emit('videoAnswer', { answer: peerConnection.localDescription, userToCall: incomingCallUser });
        setCallStatus('Call connected');
        setIncomingCall(false);
      } catch (error) {
        console.error('Error creating answer.', error);
      }
    }
  };

  const handleRejectCall = () => {
    socket.emit('callRejected', { userToCall: incomingCallUser });
    setIncomingCall(false);
  };

  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(new MediaStream());
    }
    setCallStatus('');
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('message', { user: userInfo.name, text: message, room });
      setMessage('');
    }
  };

  const sendFile = async (e) => {
    e.preventDefault();
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        socket.emit('file', { user: userInfo.name, fileName: file.name, fileContent: event.target.result, room });
        setFile(null);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileReceive = (fileName, fileContent) => {
    const blob = new Blob([new Uint8Array(fileContent)]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
      setIsMuted((prevState) => !prevState);
    }
  };

  const handleVideoOff = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !isVideoOff));
      setIsVideoOff((prevState) => !prevState);
    }
  };

  return (
    <ChatContainer>
      <Title>Welcome to the Chat Application</Title>
      <UserListContainer>
        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <UserList>
          {loading ? (
            <ClipLoader color={'#123abc'} loading={loading} size={50} />
          ) : (
            users
              .filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((user) => (
                <UserItem key={user._id}>
                  <p>{user.name}</p>
                  <Button onClick={() => handleCall(user.name)}>Call</Button>
                </UserItem>
              ))
          )}
        </UserList>
      </UserListContainer>
      <div>
        <Video localStream={localStream} remoteStream={remoteStream} />
        <CallStatus connected={callStatus === 'Call connected'}>
          {callStatus || 'No call in progress'}
        </CallStatus>
        {incomingCall && (
          <IncomingCall>
            <p>{incomingCallUser} is calling...</p>
            <Button onClick={handleAcceptCall}>Accept</Button>
            <Button onClick={handleRejectCall}>Reject</Button>
          </IncomingCall>
        )}
        <Button onClick={handleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleVideoOff}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
        <form onSubmit={sendMessage}>
          <MessageContainer>
            <MessageInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <Button type="submit">Send Message</Button>
          </MessageContainer>
        </form>
        <form onSubmit={sendFile}>
          <FileInput type="file" onChange={(e) => setFile(e.target.files[0])} />
          <Button type="submit">Send File</Button>
        </form>
        <MessagesList>
          {messages.map((msg, index) => (
            <Message key={index} user={msg.user} text={msg.text} />
          ))}
        </MessagesList>
      </div>
      <ToastContainer />
    </ChatContainer>
  );
};

export default Chat;
