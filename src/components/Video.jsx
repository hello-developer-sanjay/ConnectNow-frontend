import React, { useEffect, useRef } from "react";
import styled from "styled-components";

const VideoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 600px;
  height: auto;
  border: 1px solid #ddd;
`;

const Video = ({ localStream, remoteStream, isMuted, isVideoOff, onMuteToggle, onVideoToggle }) => {
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

  useEffect(() => {
    const handlePlay = () => {
      console.log("Video is playing");
    };

    if (localVideoRef.current) {
      localVideoRef.current.addEventListener("play", handlePlay);
    }

    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.removeEventListener("play", handlePlay);
      }
    };
  }, []);

  return (
    <VideoWrapper>
      <VideoElement
        ref={localVideoRef}
        autoPlay
        muted={isMuted}
        playsInline
      />
      <VideoElement
        ref={remoteVideoRef}
        autoPlay
        playsInline
      />
    </VideoWrapper>
  );
};

export default Video;
