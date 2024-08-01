import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;
`;

const VideoElement = styled.video`
  width: 300px;
  height: 200px;
  border: 1px solid #ccc;
  margin: 0.5rem;
`;

const Video = ({ localStream, remoteStreams, handleCallEnd }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    remoteStreams.forEach(({ user, stream }) => {
      if (remoteVideoRefs.current[user]) {
        remoteVideoRefs.current[user].srcObject = stream;
      }
    });
  }, [remoteStreams]);

  return (
    <VideoContainer>
      <VideoElement ref={localVideoRef} autoPlay muted />
      {remoteStreams.map(({ user }) => (
        <VideoElement
          key={user}
          ref={(el) => (remoteVideoRefs.current[user] = el)}
          autoPlay
          controls
        />
      ))}
      <button onClick={() => handleCallEnd('commonroom')}>End Call</button>
    </VideoContainer>
  );
};

export default Video;
