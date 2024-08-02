import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  width: 100%;
`;

const StyledVideo = styled.video`
  width: 45%;
  max-width: 600px;
  border: 2px solid #ccc;
  border-radius: 8px;
  margin: 0 0.5rem;
`;

const Video = ({ localStream, remoteStream, isMuted, isVideoOff }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
      <StyledVideo
        ref={localVideoRef}
        autoPlay
        playsInline
        muted={isMuted}
        style={{ display: isVideoOff ? 'none' : 'block' }}
      />
      <StyledVideo
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false} // Remote video should not be muted
      />
    </VideoContainer>
  );
};

export default Video;
