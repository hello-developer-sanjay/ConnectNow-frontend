import React, { useRef, useEffect } from 'react';

const Video = ({ stream, muted }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement && stream) {
      videoElement.srcObject = stream;
    }

    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default Video;
