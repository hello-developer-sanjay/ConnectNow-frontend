import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
`;

const VideoBox = styled.video`
  width: 48%;
  height: auto;
  border: 2px solid #ccc;
  border-radius: 4px;
  background-color: #000;
`;

const Video = ({ localStream, remoteStream }) => {
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
      <VideoBox ref={localVideoRef} autoPlay muted />
      <VideoBox ref={remoteVideoRef} autoPlay />
    </VideoContainer>
  );
};

export default Video;
