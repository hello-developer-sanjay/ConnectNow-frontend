import React from "react";
import styled from "styled-components";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  background-color: #1a1a1a;
  padding: 1rem;
  border-radius: 8px;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: 8px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`;

const ControlButton = styled.button`
  background: linear-gradient(to right, #007bff, #00ff7f);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  transition: transform 0.3s ease;

  &:hover {
    background: linear-gradient(to right, #0056b3, #00cc6a);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const Video = ({
  localStream,
  remoteStream,
  toggleAudio,
  toggleVideo,
  isMuted,
  isVideoOff,
  handleCallEnd,
}) => {
  return (
    <VideoContainer>
      <VideoElement
        ref={(video) => {
          if (video) {
            video.srcObject = localStream;
          }
        }}
        autoPlay
        muted
        playsInline
      />
      <VideoElement
        ref={(video) => {
          if (video) {
            video.srcObject = remoteStream;
          }
        }}
        autoPlay
        playsInline
      />
      <ButtonContainer>
        <ControlButton onClick={toggleAudio}>
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </ControlButton>
        <ControlButton onClick={toggleVideo}>
          {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
        </ControlButton>
        <ControlButton onClick={handleCallEnd}>End Call</ControlButton>
      </ButtonContainer>
    </VideoContainer>
  );
};

export default Video;
