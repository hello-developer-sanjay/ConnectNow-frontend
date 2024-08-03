import React, { useRef, useEffect } from "react";

const Video = ({ localStream, remoteStream }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        style={{ width: "50%", height: "auto" }}
      />
      <video
        ref={remoteVideoRef}
        autoPlay
        style={{ width: "50%", height: "auto" }}
      />
    </div>
  );
};

export default Video;
