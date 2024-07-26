import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1rem;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 500px;
  margin-bottom: 1rem;
`;

const ControlButton = styled.button`
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

const Video = ({ localStream, remoteStream, isMuted, toggleMute, isVideoOff, toggleVideo }) => {
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

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.muted = true; // Ensure local video is muted
    }
  }, []);

  return (
    <VideoContainer>
      <VideoElement playsInline ref={localVideoRef} autoPlay />
      <VideoElement playsInline ref={remoteVideoRef} autoPlay />
      <ControlButton onClick={toggleMute}>
        {isMuted ? 'Unmute' : 'Mute'}
      </ControlButton>
      <ControlButton onClick={toggleVideo}>
        {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
      </ControlButton>
    </VideoContainer>
  );
};

export default Video;
