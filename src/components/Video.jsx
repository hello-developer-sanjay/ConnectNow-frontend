import { useEffect, useRef } from "react";

export default function Video({ localStream, remoteStream }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log("Local stream set in video element:", localStream.getTracks());
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log("Remote stream set in video element:", remoteStream.getTracks());
      // Only call play() if not already playing
      if (remoteVideoRef.current.paused) {
        remoteVideoRef.current
          .play()
          .catch((e) => console.error("Error playing remote video:", e));
      }
    }
  }, [remoteStream]);

  return (
    <div>
      <h2>Video Chat</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
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
