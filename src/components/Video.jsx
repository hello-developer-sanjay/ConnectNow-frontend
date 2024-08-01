import React from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  max-width: 600px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 1rem;
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

const Video = ({ localStream, remoteStream, handleCallEnd, handleMuteToggle, handleVideoToggle, isMuted, isVideoOff }) => {
  return (
    <VideoContainer>
      <VideoElement
        ref={(video) => {
          if (video && localStream) {
            video.srcObject = localStream;
          }
        }}
        autoPlay
        muted
      />
      <VideoElement
        ref={(video) => {
          if (video && remoteStream) {
            video.srcObject = remoteStream;
          }
        }}
        autoPlay
      />
      <Button onClick={handleCallEnd}>End Call</Button>
      <Button onClick={handleMuteToggle}>
        {isMuted ? 'Unmute' : 'Mute'}
      </Button>
      <Button onClick={handleVideoToggle}>
        {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
      </Button>
    </VideoContainer>
  );
};

export default Video;
