import React, { useRef, useEffect } from "react";
import styled from "styled-components";

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: black;
`;

const VideoElement = styled.video`
  width: 100%;
  height: auto;
`;

const Video = ({ stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  return (
    <VideoContainer>
      <VideoElement ref={videoRef} playsInline autoPlay />
    </VideoContainer>
  );
};

export default Video;
