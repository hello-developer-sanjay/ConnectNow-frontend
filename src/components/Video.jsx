// Video.jsx
import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.video`
  width: 100%;
  max-width: 400px;
  margin: 1rem;
  border: 2px solid #ccc;
  border-radius: 4px;
`;

const Video = ({ stream, muted }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <VideoContainer ref={videoRef} autoPlay playsInline muted={muted} />;
};

export default Video;
