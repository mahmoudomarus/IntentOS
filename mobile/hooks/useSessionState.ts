import { useRef, useCallback } from 'react';
import { WidgetPhase } from '../components/widgets/WidgetShell';

export interface SessionState {
  activeTask: string | null;
  phase: WidgetPhase | null;
  selectedProvider: string | null;
  selectedService: string | null;
  taskData: Record<string, any>;
  gatewayConnected?: boolean;
}

const PROVIDER_LABELS: Record<string, Record<string, string>> = {
  order_ride: { uber: 'Uber', lyft: 'Lyft', waymo: 'Waymo', via: 'Via' },
  order_food: { doordash: 'DoorDash', ubereats: 'Uber Eats', grubhub: 'Grubhub', postmates: 'Postmates' },
  message_contact: { imessage: 'iMessage', whatsapp: 'WhatsApp', gmail: 'Gmail', telegram: 'Telegram', slack: 'Slack', sms: 'SMS' },
  search_shopping: { amazon: 'Amazon', ebay: 'eBay', target: 'Target', etsy: 'Etsy' },
  play_music: { spotify: 'Spotify', apple_music: 'Apple Music', youtube_music: 'YouTube Music', soundcloud: 'SoundCloud' },
};

const SERVICE_LABELS: Record<string, string> = {
  economy: 'Economy', premium: 'Premium', xl: 'XL',
};

const TASK_LABELS: Record<string, string> = {
  order_ride: 'ride',
  order_food: 'food delivery',
  message_contact: 'message',
  search_shopping: 'shopping',
  play_music: 'music',
  set_timer: 'timer',
  get_weather: 'weather',
};

export function useSessionState() {
  const stateRef = useRef<SessionState>({
    activeTask: null,
    phase: null,
    selectedProvider: null,
    selectedService: null,
    taskData: {},
    gatewayConnected: false,
  });

  const update = useCallback((partial: Partial<SessionState>) => {
    stateRef.current = { ...stateRef.current, ...partial };
  }, []);

  const reset = useCallback(() => {
    const gw = stateRef.current.gatewayConnected;
    stateRef.current = {
      activeTask: null,
      phase: null,
      selectedProvider: null,
      selectedService: null,
      taskData: {},
      gatewayConnected: gw,
    };
  }, []);

  const getState = useCallback((): SessionState => stateRef.current, []);

  const getContextForAI = useCallback((): string => {
    const s = stateRef.current;
    if (!s.activeTask || !s.phase) return '';

    const taskLabel = TASK_LABELS[s.activeTask] || s.activeTask;
    const dest = s.taskData.destination ? ` to ${s.taskData.destination}` : '';
    const providerMap = PROVIDER_LABELS[s.activeTask] || {};
    const providerList = Object.values(providerMap).join(', ');

    switch (s.phase) {
      case 'searching':
        return `[CONTEXT] Searching for ${taskLabel}${dest}. UI is loading.`;

      case 'providers': {
        return `[CONTEXT] Active task: ${taskLabel}${dest}. UI is showing app options: ${providerList}. Waiting for user to pick an app. Do NOT confirm anything yet. If the user says an app name, acknowledge it.`;
      }

      case 'options': {
        const prov = s.selectedProvider ? (providerMap[s.selectedProvider] || s.selectedProvider) : 'app';
        return `[CONTEXT] Active task: ${taskLabel}${dest}. User chose ${prov}. UI is now showing service tiers (Economy, Premium, XL). Waiting for user to pick a tier. If they say one, acknowledge it.`;
      }

      case 'confirming': {
        const prov = s.selectedProvider ? (providerMap[s.selectedProvider] || s.selectedProvider) : '';
        const svc = s.selectedService ? (SERVICE_LABELS[s.selectedService] || s.selectedService) : '';
        return `[CONTEXT] Active task: ${taskLabel}${dest}. User chose ${prov} ${svc}. Now searching for a driver. Do NOT make up driver details yet — say "looking for a driver near you" or similar.`;
      }

      case 'active': {
        const prov = s.selectedProvider ? (providerMap[s.selectedProvider] || s.selectedProvider) : '';
        return `[CONTEXT] Active task: ${taskLabel}${dest} via ${prov}. Ride/order is now active and showing on screen. Driver details are visible. You can confirm briefly.`;
      }

      default:
        return '';
    }
  }, []);

  return { update, reset, getState, getContextForAI, stateRef };
}
