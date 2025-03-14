import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('https://connectnow-backend-24july.onrender.com');

export default function VideoChat() {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    useEffect(() => {
        async function getMedia() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                socket.emit('join-room');
            } catch (error) {
                console.error('Error accessing media devices.', error);
            }
        }
        getMedia();
    }, []);

    useEffect(() => {
        socket.on('offer', async (offer) => {
            const pc = createPeerConnection();
            setPeerConnection(pc);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', answer);
        });

        socket.on('answer', async (answer) => {
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        socket.on('candidate', async (candidate) => {
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });
    }, [peerConnection]);

    function createPeerConnection() {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate);
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            setRemoteStream(event.streams[0]);
        };

        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        return pc;
    }

    async function startCall() {
        const pc = createPeerConnection();
        setPeerConnection(pc);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', offer);
    }

    return (
        <div>
            <h2>Video Chat</h2>
            <div style={{ display: 'flex', gap: '20px' }}>
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '300px', border: '2px solid green' }} />
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px', border: '2px solid red' }} />
            </div>
            <button onClick={startCall}>Start Call</button>
        </div>
    );
}
