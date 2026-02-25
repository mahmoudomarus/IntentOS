import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { generateAPIUrl } from '../utils';

// Tool executor type: async function provided by useGatewayTools
export type ToolExecutor = (toolName: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  result: Record<string, any> | null;
}

export type VoiceState = 'disconnected' | 'connecting' | 'idle' | 'listening' | 'speaking' | 'thinking';

export function useRealtimeVoice(
  getContextForAI?: () => string,
  executeTool?: ToolExecutor,
) {
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [transcript, setTranscript] = useState('');
  const [aiTranscript, setAiTranscript] = useState('');
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [pendingTools, setPendingTools] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextGetterRef = useRef(getContextForAI);
  contextGetterRef.current = getContextForAI;

  const executeToolRef = useRef(executeTool);
  executeToolRef.current = executeTool;

  const connect = useCallback(async () => {
    try {
      setVoiceState('connecting');
      setError(null);

      // 1. Get ephemeral token from our backend
      const tokenUrl = generateAPIUrl('/api/realtime/token');
      const tokenRes = await fetch(tokenUrl, { method: 'POST' });
      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        throw new Error(errData.error || `Token request failed: ${tokenRes.status}`);
      }
      const tokenData = await tokenRes.json();
      const ephemeralKey = tokenData.client_secret?.value;
      if (!ephemeralKey) throw new Error('No ephemeral key returned');

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Handle remote audio
      if (Platform.OS === 'web') {
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioRef.current = audioEl;
        pc.ontrack = (event) => {
          audioEl.srcObject = event.streams[0];
        };
      } else {
        pc.addEventListener('track', (event: any) => {
          // Native audio handled by WebRTC
        });
      }

      // 4. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 5. Create data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('[RealtimeVoice] Data channel open');
        setVoiceState('idle');
      };

      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEvent(data);
        } catch (e) {
          console.warn('[RealtimeVoice] Failed to parse event:', e);
        }
      };

      dc.onerror = (err) => {
        console.error('[RealtimeVoice] Data channel error:', err);
      };

      dc.onclose = () => {
        console.log('[RealtimeVoice] Data channel closed');
        setVoiceState('disconnected');
      };

      // 6. SDP exchange
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-mini-realtime-preview';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        console.log('[RealtimeVoice] Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setVoiceState('disconnected');
        }
      };
    } catch (err: any) {
      console.error('[RealtimeVoice] Connection error:', err);
      setError(err.message || 'Failed to connect');
      setVoiceState('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVoiceState('disconnected');
    setTranscript('');
    setAiTranscript('');
    setIsMuted(false);
  }, []);

  // Inject current widget context before triggering a response
  const injectContext = useCallback(() => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;
    const ctx = contextGetterRef.current?.();
    if (!ctx) return;
    console.log('[RealtimeVoice] Injecting context:', ctx.slice(0, 100));
    dcRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: ctx }],
      },
    }));
  }, []);

  const injectContextRef = useRef(injectContext);
  injectContextRef.current = injectContext;

  const sendTextMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;

    // Send as a conversation item
    dcRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    }));

    // Inject context before response
    injectContext();

    // Trigger a response
    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
  }, [injectContext]);

  const handleServerEvent = useCallback((data: any) => {
    // Log all non-audio events for debugging
    if (!data.type?.includes('audio.delta') && !data.type?.includes('audio_buffer.committed')) {
      console.log('[RealtimeVoice] Event:', data.type, data.type?.includes('function') || data.type?.includes('output_item') ? JSON.stringify(data).slice(0, 300) : '');
    }

    switch (data.type) {
      case 'input_audio_buffer.speech_started':
        setVoiceState('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
        // Inject current widget context so the auto-response is phase-aware
        injectContextRef.current();
        break;

      case 'response.created':
        setVoiceState('thinking');
        break;

      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        setAiTranscript(data.transcript || '');
        setVoiceState('idle');
        break;

      case 'response.audio.delta':
      case 'response.output_audio.delta':
        setVoiceState('speaking');
        break;

      case 'response.done':
        setVoiceState('idle');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        setTranscript(data.transcript || '');
        break;

      case 'response.output_item.added': {
        // Detect function call starting — show searching UI immediately
        if (data.item?.type === 'function_call' && data.item?.name) {
          console.log('[RealtimeVoice] Tool PENDING:', data.item.name);
          setPendingTools((prev) => [...prev, data.item.name]);
        }
        break;
      }

      case 'response.function_call_arguments.done': {
        const toolName = data.name;
        const callId = data.call_id;
        const args = JSON.parse(data.arguments || '{}');

        console.log('[RealtimeVoice] Tool call received:', toolName, args);

        // Clear from pending
        setPendingTools((prev) => prev.filter((t) => t !== toolName));

        // Execute tool asynchronously via Gateway (or fallback if no executor)
        const executor = executeToolRef.current;
        if (executor) {
          // Async execution: the result is sent back to OpenAI only after the Gateway responds
          executor(toolName, args)
            .then((result) => {
              console.log('[RealtimeVoice] Gateway tool result:', toolName, JSON.stringify(result).slice(0, 200));

              const toolCall: ToolCall = {
                id: callId,
                name: toolName,
                args,
                result,
              };
              setToolCalls((prev) => [...prev, toolCall]);

              // Send result back to OpenAI Realtime
              if (dcRef.current && dcRef.current.readyState === 'open') {
                dcRef.current.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify(result),
                  },
                }));
                injectContextRef.current();
                dcRef.current.send(JSON.stringify({ type: 'response.create' }));
              }
            })
            .catch((err) => {
              console.error('[RealtimeVoice] Tool execution error:', toolName, err);

              // Send error result back so OpenAI Realtime doesn't hang
              const errorResult = { error: true, message: (err as Error).message || 'Tool execution failed' };
              const toolCall: ToolCall = {
                id: callId,
                name: toolName,
                args,
                result: errorResult,
              };
              setToolCalls((prev) => [...prev, toolCall]);

              if (dcRef.current && dcRef.current.readyState === 'open') {
                dcRef.current.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify(errorResult),
                  },
                }));
                dcRef.current.send(JSON.stringify({ type: 'response.create' }));
              }
            });
        } else {
          // No executor available — send a minimal fallback so OpenAI doesn't hang
          console.warn('[RealtimeVoice] No tool executor available for:', toolName);
          const fallback = { error: true, message: 'Gateway not connected — tool execution unavailable' };
          if (dcRef.current && dcRef.current.readyState === 'open') {
            dcRef.current.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify(fallback),
              },
            }));
            dcRef.current.send(JSON.stringify({ type: 'response.create' }));
          }
        }
        break;
      }

      default:
        break;
    }
  }, []);

  const dismissToolCall = useCallback((id: string) => {
    setToolCalls((prev) => prev.filter((tc) => tc.id !== id));
  }, []);

  const clearAllToolCalls = useCallback(() => {
    setToolCalls([]);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      let newMutedState = isMuted;
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        newMutedState = !track.enabled;
      });
      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  return {
    voiceState,
    transcript,
    aiTranscript,
    toolCalls,
    pendingTools,
    error,
    isMuted,
    connect,
    disconnect,
    toggleMute,
    sendTextMessage,
    sendContextMessage: injectContext,
    dismissToolCall,
    clearAllToolCalls,
    isConnected: voiceState !== 'disconnected' && voiceState !== 'connecting',
  };
}
