import React, { useRef, useEffect } from 'react';

const Video = ({ localStream, remoteStream }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '45%', height: 'auto' }}
      />
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{ width: '45%', height: 'auto' }}
      />
    </div>
  );
};

export default Video;
