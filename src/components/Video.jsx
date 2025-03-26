import { useEffect, useRef } from "react";

export default function Video({ localStream, remoteStream }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div>
      <h2>Video Chat</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted // Mute local video to prevent echo
          playsInline
          style={{ width: "300px", border: "2px solid green" }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "300px", border: "2px solid red" }}
        />
      </div>
    </div>
  );
}
