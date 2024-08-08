import React from "react";
import styled from "styled-components";

const VideoContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
`;

const VideoElement = styled.video`
  width: 45%;
  height: auto;
  background-color: black;
`;

const Video = ({ localStream, remoteStream }) => {
  return (
    <VideoContainer>
      <VideoElement
        playsInline
        muted
        autoPlay
        ref={(video) => {
          if (video && localStream) {
            video.srcObject = localStream;
          }
        }}
      />
      <VideoElement
        playsInline
        autoPlay
        ref={(video) => {
          if (video && remoteStream) {
            video.srcObject = remoteStream;
          }
        }}
      />
    </VideoContainer>
  );
};

export default Video;
