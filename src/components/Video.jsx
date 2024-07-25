import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
`;

const VideoElement = styled.video`
  width: 300px;
  height: 200px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #000;
  margin: 0 0.5rem;
`;

const Video = ({ localStream, remoteStream }) => {
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
      <VideoElement ref={localVideoRef} autoPlay muted />
      <VideoElement ref={remoteVideoRef} autoPlay />
    </VideoContainer>
  );
};

export default Video;
