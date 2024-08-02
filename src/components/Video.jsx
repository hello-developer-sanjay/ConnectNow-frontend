import React, { useRef, useEffect } from "react";
import styled from "styled-components";

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin-top: 1rem;
`;

const VideoElement = styled.video`
  width: 300px;
  height: 200px;
  background: #000;
  border: 2px solid #ccc;
  margin: 0.5rem;
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

const Video = ({
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  toggleMute,
  toggleVideo,
}) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <VideoContainer>
      <VideoElement ref={localVideoRef} autoPlay muted={isMuted} />
      <VideoElement ref={remoteVideoRef} autoPlay />
      <ControlButton onClick={toggleMute}>
        {isMuted ? "Unmute" : "Mute"}
      </ControlButton>
      <ControlButton onClick={toggleVideo}>
        {isVideoOff ? "Turn Video On" : "Turn Video Off"}
      </ControlButton>
    </VideoContainer>
  );
};

export default Video;
