import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const VideoElement = styled.video`
  width: 100%;
  max-width: 400px;
  height: auto;
  margin-bottom: 1rem;
  background-color: black;
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

const ControlButton = styled.button`
  padding: 0.5rem 1rem;
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

const CallStatus = styled.p`
  margin: 1rem 0;
  font-size: 1rem;
  color: ${(props) => (props.connected ? 'green' : 'red')};
  text-align: center;
`;

const Video = ({
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  toggleMute,
  toggleVideo,
  endCall,
  callStatus,
}) => {
  return (
    <VideoContainer>
      <VideoElement
        ref={(video) => {
          if (video) {
            video.srcObject = localStream;
          }
        }}
        autoPlay
        muted
      />
      <VideoElement
        ref={(video) => {
          if (video) {
            video.srcObject = remoteStream;
          }
        }}
        autoPlay
      />
      <ControlsContainer>
        <ControlButton onClick={toggleMute}>
          {isMuted ? 'Unmute' : 'Mute'}
        </ControlButton>
        <ControlButton onClick={toggleVideo}>
          {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
        </ControlButton>
        <ControlButton onClick={endCall}>End Call</ControlButton>
      </ControlsContainer>
      <CallStatus connected={callStatus === 'Connected'}>
        {callStatus}
      </CallStatus>
    </VideoContainer>
  );
};

export default Video;


