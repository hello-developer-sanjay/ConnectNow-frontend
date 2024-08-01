import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 600px;
  border: 1px solid #ccc;
  border-radius: 8px;
`;

const VideoControls = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
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

const Video = ({ localStream, remoteStream, handleToggleMute, handleToggleVideo, isMuted, isVideoOff }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((error) => {
        console.error('Error playing local video:', error);
      });
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((error) => {
        console.error('Error playing remote video:', error);
      });
    }
  }, [remoteStream]);

  return (
    <VideoContainer>
      <div>
        <h2>Local Video</h2>
        <VideoElement ref={localVideoRef} muted autoPlay />
      </div>
      <div>
        <h2>Remote Video</h2>
        <VideoElement ref={remoteVideoRef} autoPlay />
      </div>
      <VideoControls>
        <Button onClick={handleToggleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleToggleVideo}>{isVideoOff ? 'Show Video' : 'Hide Video'}</Button>
      </VideoControls>
    </VideoContainer>
  );
};

export default Video;
