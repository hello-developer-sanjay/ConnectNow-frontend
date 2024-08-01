import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
`;

const VideoElement = styled.video`
  width: 45%;
  height: auto;
  border: 2px solid #ccc;
  border-radius: 4px;
  background: #000;
`;

const Video = ({ localStream, remoteStream, isMuted, isVideoOff }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log('Local video stream set:', localStream);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log('Remote video stream set:', remoteStream);
    }
  }, [remoteStream]);

  return (
    <VideoContainer>
      <VideoElement ref={localVideoRef} autoPlay playsInline muted={isMuted} style={{ display: isVideoOff ? 'none' : 'block' }} />
      <VideoElement ref={remoteVideoRef} autoPlay playsInline />
    </VideoContainer>
  );
};

export default Video;
