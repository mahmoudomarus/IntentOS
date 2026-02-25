import { useEffect, useRef } from 'react';
import { SessionState } from './useSessionState';

// All recognized provider names mapped to their IDs
const PROVIDER_PATTERNS: Record<string, { regex: RegExp; toolTypes: string[] }> = {
  uber:          { regex: /\buber\b/i,             toolTypes: ['order_ride'] },
  lyft:          { regex: /\blyft\b/i,             toolTypes: ['order_ride'] },
  waymo:         { regex: /\bwaymo\b/i,            toolTypes: ['order_ride'] },
  via:           { regex: /\bvia\b/i,              toolTypes: ['order_ride'] },
  doordash:      { regex: /\bdoor\s?dash\b/i,      toolTypes: ['order_food'] },
  ubereats:      { regex: /\buber\s?eats?\b/i,     toolTypes: ['order_food'] },
  grubhub:       { regex: /\bgrub\s?hub\b/i,       toolTypes: ['order_food'] },
  postmates:     { regex: /\bpostmates?\b/i,        toolTypes: ['order_food'] },
  imessage:      { regex: /\bi\s?message\b/i,      toolTypes: ['message_contact'] },
  whatsapp:      { regex: /\bwhats?\s?app\b/i,     toolTypes: ['message_contact'] },
  gmail:         { regex: /\bgmail\b/i,            toolTypes: ['message_contact'] },
  telegram:      { regex: /\btelegram\b/i,         toolTypes: ['message_contact'] },
  slack:         { regex: /\bslack\b/i,            toolTypes: ['message_contact'] },
  sms:           { regex: /\bsms\b|\btext\s?message\b/i, toolTypes: ['message_contact'] },
  amazon:        { regex: /\bamazon\b/i,           toolTypes: ['search_shopping'] },
  ebay:          { regex: /\bebay\b/i,             toolTypes: ['search_shopping'] },
  target:        { regex: /\btarget\b/i,           toolTypes: ['search_shopping'] },
  etsy:          { regex: /\betsy\b/i,             toolTypes: ['search_shopping'] },
  spotify:       { regex: /\bspotify\b/i,          toolTypes: ['play_music'] },
  apple_music:   { regex: /\bapple\s?music\b/i,    toolTypes: ['play_music'] },
  youtube_music: { regex: /\byoutube\s?music\b/i,  toolTypes: ['play_music'] },
  soundcloud:    { regex: /\bsound\s?cloud\b/i,    toolTypes: ['play_music'] },
};

// Service tier patterns (for rides)
const SERVICE_PATTERNS: { id: string; regex: RegExp }[] = [
  { id: 'xl',      regex: /\bxl\b|\bextra\s?large\b/i },
  { id: 'premium',  regex: /\bpremium\b|\blux\b|\bblack\b|\bfirst\s?class\b/i },
  { id: 'economy',  regex: /\beconomy\b|\bstandard\b|\bregular\b|\bcheap/i },
];

// Confirmation patterns
const CONFIRM_REGEX = /\b(yes|yeah|yep|yup|sure|confirm|book\s?it|go\s?ahead|do\s?it|okay|ok)\b/i;
const CANCEL_REGEX = /\b(cancel|never\s?mind|stop|no|nah|forget\s?it)\b/i;

interface RouterCallbacks {
  onSelectProvider: (toolType: string, providerId: string) => void;
  onSelectService: (serviceId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useVoiceCommandRouter(
  transcript: string,
  getSessionState: () => SessionState,
  callbacks: RouterCallbacks,
) {
  const lastProcessedTranscript = useRef('');

  useEffect(() => {
    if (!transcript || transcript === lastProcessedTranscript.current) return;

    const state = getSessionState();
    if (!state.activeTask || !state.phase) return;

    const text = transcript.trim();
    // Only process new text (incremental transcript)
    lastProcessedTranscript.current = text;

    console.log('[VoiceRouter] Processing:', text, 'phase:', state.phase, 'task:', state.activeTask);

    // ── Phase: providers → detect provider name ──
    if (state.phase === 'providers') {
      for (const [providerId, pattern] of Object.entries(PROVIDER_PATTERNS)) {
        if (pattern.regex.test(text) && pattern.toolTypes.includes(state.activeTask)) {
          console.log('[VoiceRouter] Matched provider:', providerId, 'for', state.activeTask);
          callbacks.onSelectProvider(state.activeTask, providerId);
          return;
        }
      }
      // Also check if user said the task-specific uber/lyft for rides even if food is active
      // (nope, only match for the active task's providers)
    }

    // ── Phase: options → detect service tier ──
    if (state.phase === 'options' && state.activeTask === 'order_ride') {
      for (const svc of SERVICE_PATTERNS) {
        if (svc.regex.test(text)) {
          console.log('[VoiceRouter] Matched service:', svc.id);
          callbacks.onSelectService(svc.id);
          return;
        }
      }
    }

    // ── Phase: confirming → detect yes/no ──
    if (state.phase === 'confirming') {
      if (CONFIRM_REGEX.test(text)) {
        console.log('[VoiceRouter] Confirmed');
        callbacks.onConfirm();
        return;
      }
    }

    // ── Any phase → detect cancel ──
    if (CANCEL_REGEX.test(text)) {
      console.log('[VoiceRouter] Cancelled');
      callbacks.onCancel();
      return;
    }
  }, [transcript, getSessionState, callbacks]);
}
