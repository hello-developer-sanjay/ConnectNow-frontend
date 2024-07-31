import React, { useRef, useEffect } from 'react';

const Video = ({ stream, muted }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted={muted} style={{ width: '100%', height: '100%' }} />;
};

export default Video;
