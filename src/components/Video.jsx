import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 600px;
  border: 2px solid #ddd;
  border-radius: 8px;
  margin: 0.5rem 0;
  background-color: #000;
`;

const LocalVideo = styled(VideoElement)`
  border: 2px solid #007bff;
`;

const RemoteVideo = styled(VideoElement)`
  border: 2px solid #00ff7f;
`;

const Video = ({ localStream, remoteStream }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <VideoContainer>
      <LocalVideo ref={localVideoRef} autoPlay muted />
      <RemoteVideo ref={remoteVideoRef} autoPlay />
    </VideoContainer>
  );
};

export default Video;
