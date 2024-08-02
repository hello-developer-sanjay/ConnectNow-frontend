import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
`;

const VideoElement = styled.video`
  width: 300px;
  height: 300px;
  background-color: black;
`;

const Video = ({ localStream, remoteStream }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <VideoContainer>
      <VideoElement ref={localVideoRef} autoPlay playsInline muted />
      <VideoElement ref={remoteVideoRef} autoPlay playsInline />
    </VideoContainer>
  );
};

export default Video;
