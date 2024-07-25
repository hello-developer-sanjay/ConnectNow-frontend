import React from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  background: #000;
`;

const StyledVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const ControlBar = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 5px;
  padding: 5px 10px;
`;

const Button = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  &:hover {
    color: #007bff;
  }
`;

const Video = ({ stream, autoPlay, muted, isMuted, handleMute, isVideoOff, handleVideoToggle }) => {
  const videoRef = React.useRef();

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <VideoContainer>
      <StyledVideo ref={videoRef} autoPlay={autoPlay} muted={muted} />
      <ControlBar>
        <Button onClick={handleMute}>{isMuted ? 'Unmute' : 'Mute'}</Button>
        <Button onClick={handleVideoToggle}>{isVideoOff ? 'Turn On Video' : 'Turn Off Video'}</Button>
      </ControlBar>
    </VideoContainer>
  );
};

export default Video;
