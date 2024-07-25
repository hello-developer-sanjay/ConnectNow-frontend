import React from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 500px;
  margin: 1rem 0;
  border: 1px solid #ccc;
  border-radius: 4px;
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

const CallStatus = styled.p`
  margin: 1rem 0;
  font-size: 1rem;
  color: ${(props) => (props.connected ? 'green' : 'red')};
  text-align: center;
`;

const Video = ({ localStream, remoteStream, isMuted, isVideoOff, muteAudio, toggleVideo, disconnectCall, callStatus }) => {
  return (
    <VideoContainer>
      <CallStatus connected={callStatus === 'Connected'}>
        {callStatus || 'Not connected'}
      </CallStatus>
      <VideoElement ref={(video) => { if (video) video.srcObject = localStream }} autoPlay muted />
      <VideoElement ref={(video) => { if (video) video.srcObject = remoteStream }} autoPlay />
      <Button onClick={muteAudio}>{isMuted ? 'Unmute' : 'Mute'}</Button>
      <Button onClick={toggleVideo}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
      <Button onClick={disconnectCall}>Disconnect</Button>
    </VideoContainer>
  );
};

export default Video;
