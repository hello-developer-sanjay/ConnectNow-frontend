/* eslint-disable react/prop-types */
import { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  gap: 1rem;
`;

const VideoElement = styled.video`
  width: 300px;
  height: 300px;
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
      <VideoElement ref={localVideoRef} autoPlay playsInline muted />
      <VideoElement ref={remoteVideoRef} autoPlay playsInline />
    </VideoContainer>
  );
};

export default Video;
