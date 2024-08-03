import React from "react";
import styled from "styled-components";

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: 1rem 0;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 600px;
  margin-bottom: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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

const Video = ({ localStream, remoteStream, isMuted, setIsMuted, isVideoOff, setIsVideoOff }) => {
  const localVideoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);

  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true; // Mute local video element to prevent echo
    }
  }, [localStream]);

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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

  return (
    <VideoContainer>
      <VideoElement ref={localVideoRef} autoPlay playsInline />
      <VideoElement ref={remoteVideoRef} autoPlay playsInline />
      <div>
        <Button onClick={toggleMute}>
          {isMuted ? "Unmute" : "Mute"}
        </Button>
        <Button onClick={toggleVideo}>
          {isVideoOff ? "Turn Video On" : "Turn Video Off"}
        </Button>
      </div>
    </VideoContainer>
  );
};

export default Video;
