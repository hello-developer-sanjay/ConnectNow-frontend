import React, { useRef, useEffect } from "react";
import styled from "styled-components";

const VideoWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`;

const VideoElement = styled.video`
  width: 100%;
  height: auto;
  max-width: 100%;
`;

const MuteButton = styled.button`
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
`;

const ToggleVideoButton = styled.button`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: #ff0000;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
`;

const Video = ({ localStream, remoteStream }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = false;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0]
      .enabled;
  };

  const toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0]
      .enabled;
  };

  return (
    <VideoWrapper>
      <VideoElement ref={localVideoRef} autoPlay playsInline />
      <VideoElement ref={remoteVideoRef} autoPlay playsInline />
      <MuteButton onClick={toggleMute}>Mute/Unmute</MuteButton>
      <ToggleVideoButton onClick={toggleVideo}>Toggle Video</ToggleVideoButton>
    </VideoWrapper>
  );
};

export default Video;
