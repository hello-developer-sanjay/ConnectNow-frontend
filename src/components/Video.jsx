import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
`;

const VideoBox = styled.video`
  width: 45%;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: black;
`;

const Video = ({ localStream, remoteStream }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      console.log('Attached local stream to local video element:', localStream);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log('Attached remote stream to remote video element:', remoteStream);
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
