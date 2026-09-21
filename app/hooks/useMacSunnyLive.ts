'use client';

import { useEffect, useRef, useState } from 'react';

export type LiveVoiceStatus = 'idle' | 'connecting' | 'ready' | 'listening' | 'speaking' | 'error';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type SessionMode = 'welcome' | 'voice';

const GREETING_KEY = 'macsunny-live-greeted-v1';
const GREETING = 'Welcome to MacSunny Electronics, How may we help you?';

const eventId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `event_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
};

export function useMacSunnyLive() {
  const [status, setStatus] = useState<LiveVoiceStatus>('idle');
  const [voiceActive, setVoiceActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [error, setError] = useState('');
  const [liveUserText, setLiveUserText] = useState('');
  const [liveAssistantText, setLiveAssistantText] = useState('');

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<SessionMode | null>(null);
  const sessionStartedRef = useRef(false);
  const playbackReadyRef = useRef(false);
  const greetPendingRef = useRef(false);
  const greetedRef = useRef(false);
  const greetEventRef = useRef('');
  const autoAttemptRef = useRef(false);
  const closingRef = useRef(false);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userFinalizeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantFinalizeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userBufferRef = useRef('');
  const assistantBufferRef = useRef('');
  const historyRef = useRef<ChatMessage[]>([]);

  const send = (payload: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return false;
    channel.send(JSON.stringify(payload));
    return true;
  };

  const finalizeUser = () => {
    const text = userBufferRef.current.trim();
    if (text) {
      historyRef.current.push({ role: 'user', content: text });
      historyRef.current = historyRef.current.slice(-12);
    }
    userBufferRef.current = '';
  };

  const finalizeAssistant = () => {
    const text = assistantBufferRef.current.trim();
    if (text) {
      historyRef.current.push({ role: 'assistant', content: text });
      historyRef.current = historyRef.current.slice(-12);
    }
    assistantBufferRef.current = '';
  };

  const destroyConnection = (sendClose = true, updateState = true) => {
    closingRef.current = true;
    if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    if (userFinalizeRef.current) clearTimeout(userFinalizeRef.current);
    if (assistantFinalizeRef.current) clearTimeout(assistantFinalizeRef.current);

    if (sendClose) {
      try {
        send({ type: 'session.close', event_id: eventId() });
      } catch {
        // The transport may already be gone.
      }
    }

    try {
      channelRef.current?.close();
    } catch {}
    try {
      peerRef.current?.close();
    } catch {}

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    peerRef.current = null;
    channelRef.current = null;
    modeRef.current = null;
    sessionStartedRef.current = false;
    playbackReadyRef.current = false;
    greetPendingRef.current = false;
    greetEventRef.current = '';
    autoAttemptRef.current = false;
    closingRef.current = false;

    if (updateState) {
      setVoiceActive(false);
      setMuted(false);
      setStatus('idle');
    }
  };

  const maybeSendGreeting = () => {
    if (
      !greetPendingRef.current ||
      greetedRef.current ||
      !sessionStartedRef.current ||
      !playbackReadyRef.current
    ) return;

    const id = eventId();
    greetEventRef.current = id;
    const sent = send({
      type: 'session.instructions.append',
      event_id: id,
      delegation_id: null,
      content:
        `Use English for this opening. Immediately greet the visitor before waiting for them. Say exactly: "${GREETING}" Then pause and listen. Do not add any other words to the opening.`,
    });

    if (!sent) greetEventRef.current = '';
  };

  const handleDelegation = async (delegationId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 450));

    const context = historyRef.current.slice(-10);
    const currentUser = userBufferRef.current.trim();
    if (currentUser && context.at(-1)?.content !== currentUser) {
      context.push({ role: 'user', content: currentUser });
    }

    const lastUser = context.map((message) => message.role).lastIndexOf('user');
    const messages = lastUser >= 0 ? context.slice(Math.max(0, lastUser - 8), lastUser + 1) : [];

    if (!messages.length) {
      send({
        type: 'session.commentary.append',
        event_id: eventId(),
        delegation_id: delegationId,
        content: 'I need the visitor to repeat or clarify the request before I can verify it.',
      });
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, includeProductContext: true }),
      });
      const data = await response.json();
      const result = response.ok
        ? String(data.message || 'No verified result was returned.')
        : String(data.message || 'The storefront backend could not verify that information.');

      send({
        type: 'session.commentary.append',
        event_id: eventId(),
        delegation_id: delegationId,
        content: result.slice(0, 1800),
      });
    } catch {
      send({
        type: 'session.commentary.append',
        event_id: eventId(),
        delegation_id: delegationId,
        content:
          'The storefront backend is temporarily unavailable. Do not guess. Ask the visitor to use the WhatsApp support option for verification.',
      });
    }
  };

  const handleServerEvent = (event: any) => {
    if (!event || typeof event.type !== 'string') return;

    if (event.type === 'session.started') {
      sessionStartedRef.current = true;
      setStatus(modeRef.current === 'voice' ? 'listening' : 'ready');
      setVoiceActive(modeRef.current === 'voice');
      maybeSendGreeting();
      return;
    }

    if (event.type === 'session.instructions.appended' && event.client_event_id === greetEventRef.current) {
      send({
        type: 'session.commentary.append',
        event_id: eventId(),
        delegation_id: null,
        content: 'Begin the conversation now, following the greeting instructions. Speak first, then pause and listen.',
      });
      greetedRef.current = true;
      greetPendingRef.current = false;
      setNeedsGesture(false);
      try {
        sessionStorage.setItem(GREETING_KEY, '1');
      } catch {}

      if (modeRef.current === 'welcome') {
        welcomeTimerRef.current = setTimeout(() => {
          if (modeRef.current === 'welcome') destroyConnection(true, true);
        }, 10_000);
      }
      return;
    }

    if (event.type === 'session.input_transcript.delta' && typeof event.delta === 'string') {
      setStatus('listening');
      userBufferRef.current += event.delta;
      setLiveUserText(userBufferRef.current.slice(-400));
      if (userFinalizeRef.current) clearTimeout(userFinalizeRef.current);
      userFinalizeRef.current = setTimeout(finalizeUser, 800);
      return;
    }

    if (event.type === 'session.output_transcript.delta' && typeof event.delta === 'string') {
      setStatus('speaking');
      assistantBufferRef.current += event.delta;
      setLiveAssistantText(assistantBufferRef.current.slice(-400));
      if (assistantFinalizeRef.current) clearTimeout(assistantFinalizeRef.current);
      assistantFinalizeRef.current = setTimeout(() => {
        finalizeAssistant();
        if (modeRef.current === 'voice') setStatus(muted ? 'ready' : 'listening');
      }, 900);
      return;
    }

    if (event.type === 'session.input_audio.muted') {
      setMuted(true);
      setStatus('ready');
      return;
    }

    if (event.type === 'session.input_audio.unmuted') {
      setMuted(false);
      setStatus('listening');
      return;
    }

    if (event.type === 'session.delegation.created' && event.delegation?.target === 'client' && event.delegation?.id) {
      void handleDelegation(String(event.delegation.id));
      return;
    }

    if (event.type === 'session.closed') {
      destroyConnection(false, true);
      return;
    }

    if (event.type === 'error') {
      const message = String(event.error?.message || 'The live voice session reported an error.');
      setError(message);
      setStatus('error');
    }
  };

  const connect = async ({
    withMicrophone,
    greet,
    automatic,
  }: {
    withMicrophone: boolean;
    greet: boolean;
    automatic: boolean;
  }) => {
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      setError('Live voice is not supported by this browser. Text chat is still available.');
      setStatus('error');
      return false;
    }

    destroyConnection(true, false);
    setError('');
    setStatus('connecting');
    setMuted(false);
    setLiveUserText('');
    setLiveAssistantText('');
    modeRef.current = withMicrophone ? 'voice' : 'welcome';
    autoAttemptRef.current = automatic;
    greetPendingRef.current = greet && !greetedRef.current;

    try {
      const peer = new RTCPeerConnection();
      const channel = peer.createDataChannel('oai-events');
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute('playsinline', '');

      peerRef.current = peer;
      channelRef.current = channel;
      audioRef.current = audio;

      channel.addEventListener('message', ({ data }) => {
        try {
          handleServerEvent(JSON.parse(String(data)));
        } catch {
          // Ignore non-JSON transport noise.
        }
      });

      channel.addEventListener('close', () => {
        if (!closingRef.current && modeRef.current) {
          setVoiceActive(false);
          setStatus('idle');
        }
      });

      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'failed') {
          setError('The live voice connection failed. Text chat is still available.');
          setStatus('error');
          destroyConnection(false, false);
        }
      });

      peer.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        audio.srcObject = stream;
        void audio.play().then(() => {
          playbackReadyRef.current = true;
          maybeSendGreeting();
        }).catch(() => {
          playbackReadyRef.current = false;
          if (autoAttemptRef.current) {
            setNeedsGesture(true);
            setStatus('idle');
            destroyConnection(true, false);
          } else {
            setError('Audio playback was blocked. Tap Start voice again to continue.');
            setStatus('error');
          }
        });
      };

      if (withMicrophone) {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone access is not supported by this browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
      } else {
        peer.addTransceiver('audio', { direction: 'recvonly' });
      }

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (!offer.sdp) throw new Error('The browser could not create a voice-session offer.');

      const response = await fetch('/api/live/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });
      const data = await response.json();

      if (!response.ok || !data?.transport?.sdp) {
        throw new Error(data?.message || 'Voice session could not be started.');
      }

      await peer.setRemoteDescription({ type: 'answer', sdp: data.transport.sdp });
      return true;
    } catch (reason) {
      destroyConnection(false, false);
      const message =
        reason instanceof DOMException && reason.name === 'NotAllowedError'
          ? 'Microphone permission was not granted. Text chat is still available.'
          : reason instanceof Error
            ? reason.message
            : 'Voice session could not be started.';
      setError(message);
      setStatus('error');
      setVoiceActive(false);
      return false;
    }
  };

  const startVoice = async (includeGreeting = false) => {
    const shouldGreet = includeGreeting || !greetedRef.current;
    setNeedsGesture(false);
    return connect({ withMicrophone: true, greet: shouldGreet, automatic: false });
  };

  const activateWelcome = async () => {
    return startVoice(true);
  };

  const stopVoice = () => {
    finalizeUser();
    finalizeAssistant();
    destroyConnection(true, true);
  };

  const toggleMute = () => {
    if (!voiceActive) return;
    const next = !muted;
    micStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    const sent = send({
      type: next ? 'session.input_audio.mute' : 'session.input_audio.unmute',
      event_id: eventId(),
    });
    if (!sent) return;
    setMuted(next);
    setStatus(next ? 'ready' : 'listening');
  };

  useEffect(() => {
    try {
      greetedRef.current = sessionStorage.getItem(GREETING_KEY) === '1';
    } catch {
      greetedRef.current = false;
    }

    if (!greetedRef.current) {
      void connect({ withMicrophone: false, greet: true, automatic: true });
    }

    return () => destroyConnection(true, false);
    // Run once for this storefront mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel =
    status === 'connecting'
      ? 'Connecting…'
      : status === 'speaking'
        ? 'Speaking'
        : status === 'listening'
          ? 'Listening'
          : status === 'ready'
            ? muted
              ? 'Muted'
              : 'Ready'
            : status === 'error'
              ? 'Voice unavailable'
              : 'Voice off';

  return {
    status,
    statusLabel,
    voiceActive,
    muted,
    needsGesture,
    error,
    liveUserText,
    liveAssistantText,
    startVoice,
    activateWelcome,
    stopVoice,
    toggleMute,
  };
}
