import React from "react";
import styled from "styled-components";

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 600px;
  margin-bottom: 1rem;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
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

const Video = ({ localStream, remoteStream, onEndCall }) => {
  const localVideoRef = React.useRef(null);
  const remoteVideoRef = React.useRef(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);

  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleMute = () => {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(!isVideoOff);
  };

  return (
    <VideoContainer>
      <VideoElement ref={localVideoRef} autoPlay playsInline muted />
      <VideoElement ref={remoteVideoRef} autoPlay playsInline />
      <ControlButton onClick={handleToggleMute}>
        {isMuted ? "Unmute" : "Mute"}
      </ControlButton>
      <ControlButton onClick={handleToggleVideo}>
        {isVideoOff ? "Turn Video On" : "Turn Video Off"}
      </ControlButton>
      <ControlButton onClick={onEndCall}>End Call</ControlButton>
    </VideoContainer>
  );
};

export default Video;
