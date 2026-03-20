import { useParams } from 'react-router-dom';
import { useVideoCall } from '../../hooks/useVideoCall.js';
import './VideoCall.css';

export default function VideoCall({ userId }) {
  const { roomId } = useParams();
  const {
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
  } = useVideoCall(roomId, userId);

  return (
    <div className="videocall-container">
      <div className="videocall-header">
        <h2>Sala: {roomId}</h2>
        {isEncrypted && (
          <span className="badge-encrypted">
            🔒 Cifrado E2E activo
          </span>
        )}
        {isConnected && (
          <span className="badge-connected">
            🟢 Conectado
          </span>
        )}
      </div>

      {error && <div className="videocall-error">⚠️ {error}</div>}

      <div className="videocall-videos">
        <div className="video-wrapper">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="video-local"
          />
          <span className="video-label">Tú</span>
        </div>
        <div className="video-wrapper">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-remote"
          />
          <span className="video-label">Remoto</span>
        </div>
      </div>

      <div className="videocall-controls">
        {!isConnected ? (
          <button className="btn-start" onClick={startCall}>
            📞 Iniciar llamada
          </button>
        ) : (
          <>
            <button
              className={`btn-control ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Activar micrófono' : 'Silenciar'}
            >
              {isMuted ? '🎙️ Activar mic' : '🔇 Silenciar'}
            </button>
            <button
              className={`btn-control ${isCameraOff ? 'active' : ''}`}
              onClick={toggleCamera}
              title={isCameraOff ? 'Activar cámara' : 'Apagar cámara'}
            >
              {isCameraOff ? '📷 Activar cam' : '🚫 Apagar cam'}
            </button>
            <button className="btn-end" onClick={endCall}>
              📵 Colgar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
