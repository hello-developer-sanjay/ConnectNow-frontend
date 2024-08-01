import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 400px;
  height: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #000;
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

const Video = ({ localStream, remoteStream, isMuted, isVideoOff, handleMuteToggle, handleVideoToggle }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <VideoContainer>
      <h2>Local Video</h2>
      <VideoElement ref={localVideoRef} autoPlay playsInline muted />
      <h2>Remote Video</h2>
      <VideoElement ref={remoteVideoRef} autoPlay playsInline />
      <div>
        <Button onClick={handleMuteToggle}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleVideoToggle}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</Button>
      </div>
    </VideoContainer>
  );
};

export default Video;
