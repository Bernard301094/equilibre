/**
 * videoCallService.js
 * Señalización WebRTC usando Supabase Realtime.
 * Gestiona el intercambio de SDP, ICE candidates y claves públicas E2E.
 */

import { supabase } from './supabase.js';

const CHANNEL_PREFIX = 'videocall:';

/**
 * Crea o se une a un canal de señalización para una sala.
 */
export function createSignalingChannel(roomId) {
  return supabase.channel(`${CHANNEL_PREFIX}${roomId}`);
}

/**
 * Envía una oferta SDP al peer remoto.
 */
export async function sendOffer(roomId, userId, sdp) {
  const channel = createSignalingChannel(roomId);
  await channel.subscribe();
  channel.send({
    type: 'broadcast',
    event: 'offer',
    payload: { userId, sdp },
  });
  return channel;
}

/**
 * Envía una respuesta SDP al peer remoto.
 */
export async function sendAnswer(channel, userId, sdp) {
  channel.send({
    type: 'broadcast',
    event: 'answer',
    payload: { userId, sdp },
  });
}

/**
 * Envía un ICE candidate al peer remoto.
 */
export function sendIceCandidate(channel, userId, candidate) {
  channel.send({
    type: 'broadcast',
    event: 'ice-candidate',
    payload: { userId, candidate },
  });
}

/**
 * Comparte la clave pública E2E con el peer (no es la clave compartida,
 * solo la clave pública ECDH para derivar el secreto compartido).
 */
export function sendPublicKey(channel, userId, publicKeyBase64) {
  channel.send({
    type: 'broadcast',
    event: 'public-key',
    payload: { userId, publicKey: publicKeyBase64 },
  });
}

/**
 * Escucha eventos de señalización en el canal.
 */
export function listenSignaling(channel, handlers) {
  const { onOffer, onAnswer, onIceCandidate, onPublicKey } = handlers;

  if (onOffer) channel.on('broadcast', { event: 'offer' }, ({ payload }) => onOffer(payload));
  if (onAnswer) channel.on('broadcast', { event: 'answer' }, ({ payload }) => onAnswer(payload));
  if (onIceCandidate)
    channel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => onIceCandidate(payload));
  if (onPublicKey)
    channel.on('broadcast', { event: 'public-key' }, ({ payload }) => onPublicKey(payload));

  return channel;
}

/**
 * Desconecta y elimina el canal de señalización.
 */
export async function destroySignalingChannel(channel) {
  await supabase.removeChannel(channel);
}
