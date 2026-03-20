/**
 * useVideoCall.js
 * Hook principal para gestionar la videollamada con E2E encryption.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  generateECDHKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
} from '../utils/e2eEncryption.js';
import {
  createSignalingChannel,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  sendPublicKey,
  listenSignaling,
  destroySignalingChannel,
} from '../services/videoCallService.js';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVideoCall(roomId, userId) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const keyPairRef = useRef(null);
  const sharedKeyRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [error, setError] = useState(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && channelRef.current) {
        sendIceCandidate(channelRef.current, userId, candidate);
      }
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setIsConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false);
      }
    };

    return pc;
  }, [userId]);

  const startCall = useCallback(async () => {
    try {
      // 1. Obtener media local
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // 2. Generar par de claves E2E
      keyPairRef.current = await generateECDHKeyPair();
      const pubKeyBase64 = await exportPublicKey(keyPairRef.current.publicKey);

      // 3. Crear PeerConnection y agregar tracks
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 4. Configurar señalización
      const channel = createSignalingChannel(roomId);
      channelRef.current = channel;

      listenSignaling(channel, {
        onOffer: async ({ sdp }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendAnswer(channel, userId, answer);
        },
        onAnswer: async ({ sdp }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        },
        onIceCandidate: async ({ candidate }) => {
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        },
        onPublicKey: async ({ publicKey: peerPubKeyBase64 }) => {
          const peerPublicKey = await importPublicKey(peerPubKeyBase64);
          sharedKeyRef.current = await deriveSharedKey(keyPairRef.current.privateKey, peerPublicKey);
          setIsEncrypted(true);
        },
      });

      await channel.subscribe();

      // 5. Compartir clave pública E2E
      sendPublicKey(channel, userId, pubKeyBase64);

      // 6. Crear y enviar oferta SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(roomId, userId, offer);
    } catch (err) {
      setError(err.message);
      console.error('Error starting call:', err);
    }
  }, [roomId, userId, createPeerConnection]);

  const endCall = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    if (channelRef.current) await destroySignalingChannel(channelRef.current);
    setIsConnected(false);
    setIsEncrypted(false);
    sharedKeyRef.current = null;
    keyPairRef.current = null;
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsCameraOff((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    isMuted,
    isCameraOff,
    isEncrypted,
    error,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    sharedKey: sharedKeyRef,
  };
}
