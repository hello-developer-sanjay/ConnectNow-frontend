import React, { useEffect, useRef } from "react";
import styled from "styled-components";

const VideoWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background-color: black;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  transform: scaleX(-1); /* Flip video horizontally for local view */
`;

const Video = ({ stream, isRemote }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  return (
    <VideoWrapper>
      <VideoElement
        ref={videoRef}
        autoPlay
        muted={isRemote ? false : true} // Mute local video
      />
    </VideoWrapper>
  );
};

export default Video;
