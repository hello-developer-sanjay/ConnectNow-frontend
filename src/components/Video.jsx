import React, { useRef, useEffect } from 'react';

const Video = ({ stream, isLocal, muted, isVideoOff }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted || isLocal}
        style={{ display: isVideoOff ? 'none' : 'block', width: '100%' }}
      />
    </div>
  );
};

export default Video;
