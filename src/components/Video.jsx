import React, { useRef, useEffect } from "react";

const Video = ({ stream, muted }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{ width: "100%", height: "auto", borderRadius: "8px" }}
      />
    </div>
  );
};

export default Video;
