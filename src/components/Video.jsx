import { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  background: black;
  padding: 1rem;
  gap: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-evenly;
  }
`;

const StyledVideo = styled.video`
  width: 100%;
  height: auto;
  max-width: 100%;
  border: 5px solid #007bff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.7);
  }

  @media (min-width: 768px) {
    width: 45%;
  }
`;

const ControlButton = styled.button`
  padding: 0.5rem 1rem;
  margin: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background: linear-gradient(to right, #007bff, #00ff7f);
  color: white;
  transition: transform 0.3s ease;

  &:hover {
    background: linear-gradient(to right, #0056b3, #00cc6a);
    transform: scale(1.1);
  }
`;

const Video = ({ localStream, remoteStream }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [isFrontCamera, setIsFrontCamera] = useState(true);

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

  const toggleCamera = async () => {
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].stop();
      const constraints = {
        video: {
          facingMode: isFrontCamera ? 'environment' : 'user',
        },
        audio: true,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      localStream.removeTrack(videoTracks[0]);
      localStream.addTrack(newVideoTrack);
      localVideoRef.current.srcObject = localStream;
      setIsFrontCamera(!isFrontCamera);
    }
  };

  const enterFullScreen = (ref) => {
    if (ref.current) {
      if (ref.current.requestFullscreen) {
        ref.current.requestFullscreen();
      } else if (ref.current.mozRequestFullScreen) { // Firefox
        ref.current.mozRequestFullScreen();
      } else if (ref.current.webkitRequestFullscreen) { // Chrome, Safari and Opera
        ref.current.webkitRequestFullscreen();
      } else if (ref.current.msRequestFullscreen) { // IE/Edge
        ref.current.msRequestFullscreen();
      }
    }
  };

  return (
    <VideoContainer>
      <StyledVideo ref={localVideoRef} autoPlay playsInline onClick={() => enterFullScreen(localVideoRef)} />
      <StyledVideo ref={remoteVideoRef} autoPlay playsInline onClick={() => enterFullScreen(remoteVideoRef)} />
      <ControlButton onClick={toggleCamera}>
        Switch to {isFrontCamera ? 'Rear' : 'Front'} Camera
      </ControlButton>
    </VideoContainer>
  );
};

export default Video;
