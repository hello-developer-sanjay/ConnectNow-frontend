import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.video`
  width: 100%;
  max-width: 400px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #000;
`;

const Video = ({ stream, muted }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <VideoContainer ref={videoRef} autoPlay muted={muted} />;
};

export default Video;
