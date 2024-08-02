import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const VideoElement = styled.video`
  width: 300px;
  height: 300px;
  background-color: black;
`;

const Video = ({ localStream, remoteStreams }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef([]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    remoteVideoRefs.current.forEach((videoRef, index) => {
      if (videoRef && remoteStreams[index]) {
        videoRef.srcObject = remoteStreams[index];
      }
    });
  }, [remoteStreams]);

  return (
    <VideoContainer>
      <VideoElement ref={localVideoRef} autoPlay playsInline muted />
      {remoteStreams.map((stream, index) => (
        <VideoElement
          key={index}
          ref={(el) => (remoteVideoRefs.current[index] = el)}
          autoPlay
          playsInline
        />
      ))}
    </VideoContainer>
  );
};

export default Video;
