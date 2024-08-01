import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  width: 100%;
  max-width: 500px;
  height: 300px;
  background: black;
  border: 2px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Video = ({ stream, muted }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <VideoContainer>
      <VideoElement ref={videoRef} autoPlay playsInline muted={muted} />
    </VideoContainer>
  );
};

export default Video;
