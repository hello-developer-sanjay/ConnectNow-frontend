import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
`;

const VideoElement = styled.video`
  width: 45%;
  max-width: 600px;
  height: auto;
  border: 2px solid #007bff;
  border-radius: 8px;
  background: black;
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
      <VideoElement ref={localVideoRef} autoPlay muted />
      <VideoElement ref={remoteVideoRef} autoPlay />
    </VideoContainer>
  );
};

export default Video;
