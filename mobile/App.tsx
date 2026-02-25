import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { generateAPIUrl } from './utils';
import { T } from './theme';
import { WidgetPhase } from './components/widgets/WidgetShell';

// Components
import AnimatedBackground from './components/AnimatedBackground';
import VoiceOrb from './components/VoiceOrb';
import OptionCards, { OptionCard } from './components/OptionCards';
import TopStatusBar from './components/TopStatusBar';
import SettingsPanel from './components/SettingsPanel';
import { ThemeProvider, useTheme } from './components/ThemeProvider';

// Widgets
import RideWidget from './components/widgets/RideWidget';
import FoodWidget from './components/widgets/FoodWidget';
import MessageWidget from './components/widgets/MessageWidget';
import ShoppingWidget from './components/widgets/ShoppingWidget';
import MusicWidget from './components/widgets/MusicWidget';
import TimerWidget from './components/widgets/TimerWidget';
import WeatherWidget from './components/widgets/WeatherWidget';

// Hooks
import { useRealtimeVoice, ToolCall } from './hooks/useRealtimeVoice';
import { useSessionState } from './hooks/useSessionState';
import { useVoiceCommandRouter } from './hooks/useVoiceCommandRouter';
import { useGatewayConnection } from './hooks/useGatewayConnection';
import { useGatewayTools } from './hooks/useGatewayTools';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Platform-appropriate fetch for text chat API fallback
const platformFetch = (() => {
  if (Platform.OS === 'web') return globalThis.fetch;
  try {
    const { fetch: expoFetch } = require('expo/fetch');
    return expoFetch as typeof globalThis.fetch;
  } catch {
    return globalThis.fetch;
  }
})();

// Labels for minimized widget pills
const WIDGET_LABELS: Record<string, string> = {
  order_ride: 'RIDE',
  order_food: 'FOOD',
  message_contact: 'MSG',
  search_shopping: 'SHOP',
  add_to_cart: 'CART',
  play_music: 'MUSIC',
  set_timer: 'TIMER',
  get_weather: 'WEATHER',
};

// Tool names we handle
const TOOL_NAMES = [
  'order_ride', 'order_food', 'message_contact',
  'search_shopping', 'add_to_cart', 'play_music',
  'set_timer', 'get_weather',
];

// Tools that show a provider/app selection step
const HAS_PROVIDERS = new Set([
  'order_ride', 'order_food', 'message_contact',
  'search_shopping', 'play_music',
]);

// Phase delays (ms) for transitions
const PHASE_DELAYS: Record<string, { searching: number; confirming: number }> = {
  order_ride: { searching: 1200, confirming: 2500 },
  order_food: { searching: 1400, confirming: 1200 },
  message_contact: { searching: 800, confirming: 800 },
  search_shopping: { searching: 1200, confirming: 0 },
  add_to_cart: { searching: 1000, confirming: 0 },
  play_music: { searching: 600, confirming: 0 },
  set_timer: { searching: 500, confirming: 0 },
  get_weather: { searching: 1200, confirming: 0 },
};

interface ActiveWidget {
  id: string;
  type: string;
  phase: WidgetPhase;
  data: Record<string, any>;
  minimized: boolean;
}

function MainApp() {
  const { colors } = useTheme();
  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const textInputRef = useRef('');
  const [widgets, setWidgets] = useState<ActiveWidget[]>([]);
  const [options, setOptions] = useState<OptionCard[]>([]);
  const [displayText, setDisplayText] = useState('');

  // Phase transition timers
  const phaseTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // ── Session state (single source of truth) ──
  const { update: updateSession, reset: resetSession, getState: getSessionState, getContextForAI } = useSessionState();

  // ── Gateway connection (to OpenClaw) ──
  const gateway = useGatewayConnection();
  const gatewayTools = useGatewayTools(gateway);

  // Global Activity Tracking
  const [globalActivity, setGlobalActivity] = useState<{ runId: string, activity: string, phase: string } | null>(null);

  useEffect(() => {
    return gateway.onEvent('activity.feed', (payload: any) => {
      console.log('[IntentOS] Global activity:', payload);
      if (payload.activity === 'idle') {
        setGlobalActivity(null);
      } else {
        setGlobalActivity({
          runId: payload.runId,
          activity: payload.activity,
          phase: payload.phase,
        });
      }
    });
  }, [gateway.onEvent]);

  // Auto-connect to gateway on mount
  useEffect(() => {
    gateway.connect();
    return () => gateway.disconnect();
  }, [gateway.connect, gateway.disconnect]);

  // ── Realtime voice (with context injection + gateway tool executor) ──
  const {
    voiceState, transcript, aiTranscript, toolCalls,
    error: voiceError, connect, disconnect, sendTextMessage,
    sendContextMessage, dismissToolCall, isConnected, pendingTools,
    isMuted, toggleMute,
  } = useRealtimeVoice(getContextForAI, gatewayTools.executeTool);

  // Text chat fallback via Gateway agent
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<Error | null>(null);

  const sendChatMessage = useCallback(async (opts: { text: string }) => {
    const { text } = opts;
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    setIsChatLoading(true);
    setChatError(null);

    try {
      // 15-second strict UI timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 15000)
      );

      if (gateway.isConnected) {
        const response = await Promise.race([
          gatewayTools.sendChat(text),
          timeoutPromise
        ]);
        setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
        setDisplayText(response);
        parseOptionsFromText(response);
      } else {
        // Fallback to Next.js chat API if gateway isn't connected
        const fetchPromise = platformFetch(generateAPIUrl('/api/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
        }).then(res => res.text());

        const data = await Promise.race([fetchPromise, timeoutPromise]);
        setChatMessages(prev => [...prev, { role: 'assistant', text: data }]);
        setDisplayText(data);
        parseOptionsFromText(data);
      }
    } catch (err) {
      console.error('[IntentOS] Chat error:', err);
      setChatError(err as Error);
    } finally {
      setIsChatLoading(false);
    }
  }, [gateway.isConnected, gatewayTools.sendChat]);

  const isLoading = isChatLoading;

  const updateTextInput = (text: string) => { textInputRef.current = text; setTextInput(text); };

  // ── Sync gateway connection status into session state ──
  useEffect(() => {
    updateSession({ gatewayConnected: gateway.isConnected });
  }, [gateway.isConnected, updateSession]);

  // ── Sync session state whenever widgets change ──
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  useEffect(() => {
    const visible = widgets.filter(w => !w.minimized);
    if (visible.length === 0) {
      resetSession();
      return;
    }
    const top = visible[visible.length - 1];
    updateSession({
      activeTask: top.type,
      phase: top.phase,
      selectedProvider: top.data.provider || null,
      selectedService: top.data.service || null,
      taskData: top.data,
    });
  }, [widgets, updateSession, resetSession]);

  // ── Voice orb ──
  const handleOrbPress = useCallback(() => {
    voiceState === 'disconnected' ? connect() : disconnect();
  }, [voiceState, connect, disconnect]);

  // ── Phase transition helpers ──
  const transitionWidget = useCallback((idOrType: string, toPhase: WidgetPhase, data?: Record<string, any>) => {
    setWidgets(prev => prev.map(w =>
      (w.id === idOrType || w.type === idOrType)
        ? { ...w, phase: toPhase, ...(data ? { data: { ...w.data, ...data } } : {}) }
        : w
    ));
  }, []);

  const schedulePhaseTransition = useCallback((id: string, toPhase: WidgetPhase, delayMs: number, data?: Record<string, any>) => {
    if (phaseTimers.current[`${id}-${toPhase}`]) return;
    const timer = setTimeout(() => {
      transitionWidget(id, toPhase, data);
      delete phaseTimers.current[`${id}-${toPhase}`];
    }, delayMs);
    phaseTimers.current[`${id}-${toPhase}`] = timer;
  }, [transitionWidget]);

  // ── Create widget in searching phase ──
  const createSearchingWidget = useCallback((type: string, id: string, partialData: Record<string, any> = {}) => {
    setWidgets(prev => {
      const exists = prev.some(w => w.id === id);
      if (exists) return prev;
      const filtered = prev.filter(w => w.type !== type);
      return [...filtered, { id, type, phase: 'searching' as WidgetPhase, data: partialData, minimized: false }];
    });
  }, []);

  // ══════════════════════════════════════════════════════
  // UNIFIED HANDLERS (called by both UI taps and voice)
  // ══════════════════════════════════════════════════════

  // ── Generic provider selection → next phase ──
  const handleProviderSelect = useCallback((toolType: string, providerId: string) => {
    console.log('[IntentOS] Provider selected:', toolType, providerId);

    if (toolType === 'order_ride') {
      transitionWidget(toolType, 'options', { provider: providerId });
    } else if (toolType === 'order_food') {
      transitionWidget(toolType, 'confirming', { provider: providerId });
      const delays = PHASE_DELAYS[toolType];
      setTimeout(() => {
        const w = widgetsRef.current.find(w => w.type === toolType);
        const items = w?.data?.items || [];
        transitionWidget(toolType, 'active', {
          provider: providerId,
          status: 'Preparing',
          total: '$' + (items.length * 12.5 || 25).toFixed(2),
          courier: 'Dave',
          eta: '15 min',
          order_id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        });
      }, delays.confirming);
    } else if (toolType === 'message_contact') {
      transitionWidget(toolType, 'confirming', { provider: providerId });
      const delays = PHASE_DELAYS[toolType];
      setTimeout(() => {
        transitionWidget(toolType, 'active', {
          provider: providerId,
          status: 'Delivered',
          timestamp: new Date().toISOString(),
        });
      }, delays.confirming);
    } else if (toolType === 'search_shopping') {
      const w = widgetsRef.current.find(w => w.type === toolType);
      const query = w?.data?.query || 'item';
      transitionWidget(toolType, 'active', {
        provider: providerId,
        results: [
          { id: '1', name: `${query} - Classic Fit`, price: '$29.99', rating: 4.5, color: 'Black', sizes: ['S', 'M', 'L', 'XL'] },
          { id: '2', name: `${query} - Premium Edition`, price: '$49.99', rating: 4.8, color: 'Navy', sizes: ['S', 'M', 'L'] },
          { id: '3', name: `${query} - Sport Style`, price: '$34.99', rating: 4.2, color: 'White', sizes: ['M', 'L', 'XL'] },
        ],
      });
    } else if (toolType === 'play_music') {
      const w = widgetsRef.current.find(w => w.type === toolType);
      const query = w?.data?.query || '';
      transitionWidget(toolType, 'active', {
        provider: providerId,
        track: query || 'Blinding Lights',
        artist: query ? 'Search Result' : 'The Weeknd',
        album: 'After Hours',
        duration: '3:20',
        is_playing: true,
        progress: 0,
      });
    } else {
      transitionWidget(toolType, 'active', { provider: providerId });
    }

    // After provider selection, inject updated context into voice session
    setTimeout(() => sendContextMessage(), 100);
  }, [transitionWidget, sendContextMessage]);

  // ── Ride service selection → progressive confirming → active ──
  const handleRideServiceSelect = useCallback((serviceId: string) => {
    console.log('[IntentOS] Service selected:', serviceId);
    const currentWidget = widgetsRef.current.find(w => w.type === 'order_ride');
    const provider = currentWidget?.data?.provider || 'uber';

    // Phase 1: confirming (searching_driver)
    transitionWidget('order_ride', 'confirming', {
      service: serviceId,
      confirmingSubPhase: 'searching_driver',
    });

    // Phase 2: driver found (after 2s)
    setTimeout(() => {
      const driverData = {
        driver: 'Sarah',
        car: serviceId === 'premium' ? 'Black Mercedes S-Class' : serviceId === 'xl' ? 'White Chevy Suburban' : 'Black Tesla Model 3',
        plate: '7XYZ123',
        eta: serviceId === 'premium' ? '2 min' : serviceId === 'xl' ? '3 min' : '4 min',
        price: serviceId === 'premium' ? '$28.00' : serviceId === 'xl' ? '$35.00' : '$14.50',
        confirmingSubPhase: 'driver_found' as const,
      };
      transitionWidget('order_ride', 'confirming', driverData);

      // Phase 3: on the way → active (after 1.5s more)
      setTimeout(() => {
        transitionWidget('order_ride', 'confirming', { confirmingSubPhase: 'on_the_way' });
        // Phase 4: active (after 1s more)
        setTimeout(() => {
          transitionWidget('order_ride', 'active', {
            service: serviceId,
            provider,
            driver: 'Sarah',
            car: serviceId === 'premium' ? 'Black Mercedes S-Class' : serviceId === 'xl' ? 'White Chevy Suburban' : 'Black Tesla Model 3',
            plate: '7XYZ123',
            eta: serviceId === 'premium' ? '2 min' : serviceId === 'xl' ? '3 min' : '4 min',
            price: serviceId === 'premium' ? '$28.00' : serviceId === 'xl' ? '$35.00' : '$14.50',
            confirmingSubPhase: undefined,
          });
        }, 1000);
      }, 1500);
    }, 2000);

    // Inject context after selection
    setTimeout(() => sendContextMessage(), 100);
  }, [transitionWidget, sendContextMessage]);

  // ── Confirm handler (from voice "yes"/"book it") ──
  const handleConfirm = useCallback(() => {
    // Nothing extra needed — confirming auto-transitions to active
    console.log('[IntentOS] Confirm action (no-op, auto-transitioning)');
  }, []);

  // ── Cancel handler ──
  const handleCancel = useCallback(() => {
    const state = getSessionState();
    if (state.activeTask) {
      setWidgets(prev => prev.filter(w => w.type !== state.activeTask));
      resetSession();
    }
  }, [getSessionState, resetSession]);

  // ══════════════════════════════════════════════════════
  // VOICE COMMAND ROUTER (bridges voice → widget handlers)
  // ══════════════════════════════════════════════════════

  const routerCallbacks = useMemo(() => ({
    onSelectProvider: (toolType: string, providerId: string) => handleProviderSelect(toolType, providerId),
    onSelectService: (serviceId: string) => handleRideServiceSelect(serviceId),
    onConfirm: () => handleConfirm(),
    onCancel: () => handleCancel(),
  }), [handleProviderSelect, handleRideServiceSelect, handleConfirm, handleCancel]);

  useVoiceCommandRouter(transcript, getSessionState, routerCallbacks);

  // ══════════════════════════════════════════════════════
  // WIDGET CREATION FROM TOOL CALLS
  // ══════════════════════════════════════════════════════

  // ── Process pending tool names from voice (show searching immediately) ──
  useEffect(() => {
    if (!pendingTools || pendingTools.length === 0) return;
    const latest = pendingTools[pendingTools.length - 1];
    const id = `voice-pending-${latest}`;
    console.log('[IntentOS] Creating searching widget for pending tool:', latest);
    createSearchingWidget(latest, id);
  }, [pendingTools, createSearchingWidget]);

  // ── Process completed voice tool calls ──
  useEffect(() => {
    if (toolCalls.length === 0) return;
    const tc = toolCalls[toolCalls.length - 1];
    if (!tc.result) return;

    console.log('[IntentOS] Voice tool complete:', tc.name, 'result keys:', Object.keys(tc.result));

    const hasProviders = HAS_PROVIDERS.has(tc.name);
    const nextPhase: WidgetPhase = hasProviders ? 'providers' : 'active';

    setWidgets(prev => {
      const existing = prev.find(w => w.type === tc.name);
      if (existing) {
        console.log('[IntentOS] Upgrading widget', tc.name, 'from', existing.phase, 'to', nextPhase);
        return prev.map(w => w.type === tc.name
          ? { ...w, id: tc.id, phase: nextPhase, data: { ...w.data, ...tc.result! } }
          : w
        );
      }
      console.log('[IntentOS] Creating new widget directly:', tc.name);
      return [...prev, {
        id: tc.id,
        type: tc.name,
        phase: nextPhase,
        data: tc.result!,
        minimized: false,
      }];
    });
  }, [toolCalls]);

  // Text chat tool calls now go through Gateway → toolCalls (same as voice path)
  // No separate text chat tool processing needed.

  // ── When chat is loading, create searching widget based on last user message ──
  const lastChatTextRef = useRef('');
  useEffect(() => {
    if (!isLoading) return;
    if (chatMessages.length === 0) return;
    const lastUser = [...chatMessages].reverse().find(m => m.role === 'user');
    if (!lastUser || lastUser.text === lastChatTextRef.current) return;
    lastChatTextRef.current = lastUser.text;
    const msg = lastUser.text.toLowerCase();

    const intentMap: [RegExp, string][] = [
      [/ride|uber|lyft|cab|taxi|drive|airport/i, 'order_ride'],
      [/food|eat|order|pizza|burger|sushi|restaurant/i, 'order_food'],
      [/message|text|send|tell|msg/i, 'message_contact'],
      [/shop|buy|purchase|t-shirt|shirt|shoes|order.*online/i, 'search_shopping'],
      [/music|play|song|listen/i, 'play_music'],
      [/timer|remind|countdown|minute/i, 'set_timer'],
      [/weather|temperature|forecast|rain/i, 'get_weather'],
    ];

    for (const [regex, toolName] of intentMap) {
      if (regex.test(msg)) {
        const id = `intent-${toolName}-${Date.now()}`;
        createSearchingWidget(toolName, id);
        break;
      }
    }
  }, [isLoading, chatMessages, createSearchingWidget]);

  // ── AI transcript / text display + fallback widget creation ──
  const lastToolCallCountRef = useRef(0);
  useEffect(() => {
    if (!aiTranscript) return;
    setDisplayText(aiTranscript);
    parseOptionsFromText(aiTranscript);

    const currentToolCount = toolCalls.length;
    if (currentToolCount > lastToolCallCountRef.current) {
      lastToolCallCountRef.current = currentToolCount;
      return;
    }

    const text = aiTranscript.toLowerCase();
    const hasWeatherWidget = widgets.some(w => w.type === 'get_weather');

    if (!hasWeatherWidget && (text.includes('weather') || text.includes('temperature') || text.includes('°f') || text.includes('°c') || text.includes('forecast') || text.includes('cloudy') || text.includes('sunny') || text.includes('rain'))) {
      console.log('[IntentOS] Fallback: Creating weather widget from transcript');
      const tempMatch = aiTranscript.match(/(\d+)\s*°?\s*[fF]/);
      const locationMatch = aiTranscript.match(/(?:weather\s+(?:in|for)\s+)([A-Z][a-zA-Z\s]+?)(?:\s+is|\.|,)/i);
      const conditionMatch = aiTranscript.match(/(partly cloudy|cloudy|sunny|rainy|clear|overcast|foggy|snowing|stormy)/i);

      const fallbackData = {
        location: locationMatch?.[1]?.trim() || 'Your Location',
        temperature: tempMatch ? parseInt(tempMatch[1]) : 68,
        condition: conditionMatch?.[1] || 'Partly Cloudy',
        humidity: 55,
        wind: '12 mph',
        high: 72,
        low: 58,
        forecast: [
          { time: 'Now', temp: tempMatch ? parseInt(tempMatch[1]) : 68, condition: 'cloudy' },
          { time: '3PM', temp: 71, condition: 'sunny' },
          { time: '6PM', temp: 65, condition: 'cloudy' },
          { time: '9PM', temp: 60, condition: 'clear' },
        ],
      };

      const id = `voice-fallback-weather-${Date.now()}`;
      setWidgets(prev => {
        if (prev.some(w => w.type === 'get_weather')) return prev;
        return [...prev, { id, type: 'get_weather', phase: 'active' as WidgetPhase, data: fallbackData, minimized: false }];
      });
    }
  }, [aiTranscript, toolCalls.length, widgets]);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const last = chatMessages[chatMessages.length - 1];
    if (last.role === 'assistant' && last.text) {
      setDisplayText(last.text);
      parseOptionsFromText(last.text);
    }
  }, [chatMessages]);

  const parseOptionsFromText = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const optionLines = lines.filter(l => /^\d+[\.\)]\s/.test(l.trim()));
    if (optionLines.length >= 2) {
      setOptions(optionLines.map((line, i) => {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
        const parts = cleaned.split(/\s*[-–—]\s*/);
        return { id: `opt-${i}`, title: parts[0] || cleaned, subtitle: parts[1] };
      }));
    } else {
      setOptions([]);
    }
  };

  // Route text input through widget state machine (same patterns as voice router)
  const routeTextSelection = useCallback((text: string) => {
    const state = getSessionState();
    if (!state.activeTask || !state.phase) return;

    const lower = text.toLowerCase().trim();

    // Provider selection from text (e.g. user types "Uber" when providers are showing)
    if (state.phase === 'providers') {
      const providerMap: [RegExp, string, string[]][] = [
        [/\buber\b/i, 'uber', ['order_ride']],
        [/\blyft\b/i, 'lyft', ['order_ride']],
        [/\bwaymo\b/i, 'waymo', ['order_ride']],
        [/\bvia\b/i, 'via', ['order_ride']],
        [/\bdoor\s?dash\b/i, 'doordash', ['order_food']],
        [/\buber\s?eats?\b/i, 'ubereats', ['order_food']],
        [/\bgrub\s?hub\b/i, 'grubhub', ['order_food']],
        [/\bpostmates?\b/i, 'postmates', ['order_food']],
        [/\bi\s?message\b/i, 'imessage', ['message_contact']],
        [/\bwhats?\s?app\b/i, 'whatsapp', ['message_contact']],
        [/\bspotify\b/i, 'spotify', ['play_music']],
        [/\bapple\s?music\b/i, 'apple_music', ['play_music']],
        [/\bamazon\b/i, 'amazon', ['search_shopping']],
        [/\bebay\b/i, 'ebay', ['search_shopping']],
      ];
      for (const [regex, providerId, toolTypes] of providerMap) {
        if (regex.test(lower) && toolTypes.includes(state.activeTask)) {
          console.log('[IntentOS] Text routed to provider select:', providerId);
          handleProviderSelect(state.activeTask, providerId);
          return;
        }
      }
    }

    // Service tier selection from text (e.g. user types "XL" or "premium")
    if (state.phase === 'options' && state.activeTask === 'order_ride') {
      const serviceMap: [RegExp, string][] = [
        [/\bxl\b|\bextra\s?large\b/i, 'xl'],
        [/\bpremium\b|\blux\b|\bblack\b|\bfirst\s?class\b/i, 'premium'],
        [/\beconomy\b|\bstandard\b|\bregular\b|\bcheap/i, 'economy'],
      ];
      for (const [regex, serviceId] of serviceMap) {
        if (regex.test(lower)) {
          console.log('[IntentOS] Text routed to service select:', serviceId);
          handleRideServiceSelect(serviceId);
          return;
        }
      }
    }
  }, [getSessionState, handleProviderSelect, handleRideServiceSelect]);

  const handleOptionSelect = (option: OptionCard) => {
    setOptions([]);
    // Route through widget state machine first
    routeTextSelection(option.title);
    isConnected ? sendTextMessage(option.title) : sendChatMessage({ text: option.title });
  };

  const handleTextSubmit = (overrideText?: string) => {
    const text = (overrideText || textInputRef.current).trim();
    if (!text) return;
    setDisplayText('');

    // Route through widget state machine first (so UI updates immediately)
    routeTextSelection(text);

    isConnected ? sendTextMessage(text) : sendChatMessage({ text });
    updateTextInput('');
    setOptions([]);
  };

  const handleDismissWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    dismissToolCall(id);
  };

  const handleRestoreWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, minimized: false } : w));
  };

  // ── Derived ──
  const minimizedWidgets = widgets
    .filter(w => w.minimized)
    .map(w => ({ id: w.id, name: w.type, label: WIDGET_LABELS[w.type] || 'TASK' }));

  const visibleWidgets = widgets.filter(w => !w.minimized);

  const renderWidget = (widget: ActiveWidget) => {
    const onDismiss = () => handleDismissWidget(widget.id);
    const onProv = (pid: string) => handleProviderSelect(widget.type, pid);

    switch (widget.type) {
      case 'order_ride':
        return <RideWidget key={widget.id} phase={widget.phase} data={widget.data as any}
          onDismiss={onDismiss}
          onSelectProvider={onProv}
          onSelectService={(svc) => handleRideServiceSelect(svc)} />;
      case 'order_food':
        return <FoodWidget key={widget.id} phase={widget.phase} data={widget.data as any}
          onDismiss={onDismiss} onSelectProvider={onProv} />;
      case 'message_contact':
        return <MessageWidget key={widget.id} phase={widget.phase} data={widget.data as any}
          onDismiss={onDismiss} onSelectProvider={onProv} />;
      case 'search_shopping':
      case 'add_to_cart':
        return <ShoppingWidget key={widget.id} phase={widget.phase} data={widget.data as any}
          onDismiss={onDismiss} onSelectProvider={onProv} />;
      case 'play_music':
        return <MusicWidget key={widget.id} phase={widget.phase} data={widget.data as any}
          onDismiss={onDismiss} onSelectProvider={onProv} />;
      case 'set_timer':
        return <TimerWidget key={widget.id} phase={widget.phase} data={widget.data as any} onDismiss={onDismiss} />;
      case 'get_weather':
        return <WeatherWidget key={widget.id} phase={widget.phase} data={widget.data as any} onDismiss={onDismiss} />;
      default:
        return null;
    }
  };

  const error = voiceError || chatError?.message;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(phaseTimers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#0A0A0A' ? "light" : "dark"} />
      <AnimatedBackground />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <TopStatusBar
          isConnected={isConnected}
          gatewayStatus={gateway.status}
          minimizedWidgets={minimizedWidgets}
          onWidgetPress={handleRestoreWidget}
          onSettingsPress={() => setShowSettings(true)}
        />

        <View style={styles.mainArea}>
          {/* Global Activity Pill */}
          {globalActivity && visibleWidgets.length === 0 && !displayText && (
            <View style={[styles.globalActivityPill, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.textTertiary} style={{ marginRight: 8 }} />
              <Text style={[styles.globalActivityText, { color: colors.textPrimary }]}>
                Agent {globalActivity.runId.substring(0, 8)} is {globalActivity.phase}...
              </Text>
            </View>
          )}

          {/* Voice Orb (center when no widgets) */}
          {visibleWidgets.length === 0 && (
            <View style={styles.orbArea}>
              <VoiceOrb
                voiceState={voiceState}
                transcript={transcript}
                aiTranscript={aiTranscript}
                isMuted={isMuted}
                onMuteToggle={toggleMute}
                onPress={handleOrbPress}
              />

              {displayText && voiceState !== 'listening' && voiceState !== 'speaking' ? (
                <View style={[styles.aiTextBubble, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <Text style={[styles.aiText, { color: colors.textSecondary }]} numberOfLines={4}>{displayText}</Text>
                </View>
              ) : null}

              {isLoading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                  <Text style={[styles.loadingText, { color: colors.textTertiary }]}>PROCESSING</Text>
                </View>
              )}
            </View>
          )}

          {/* Widget Stack */}
          {visibleWidgets.length > 0 && (
            <ScrollView
              style={styles.widgetStack}
              contentContainerStyle={styles.widgetStackContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Mini orb when widgets showing */}
              <View style={styles.miniOrbRow}>
                <TouchableOpacity onPress={handleOrbPress} style={[styles.miniOrb, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={[
                    styles.miniOrbDot,
                    { backgroundColor: voiceState === 'listening' ? colors.danger : voiceState === 'thinking' ? colors.accent : voiceState === 'speaking' ? colors.success : colors.textPrimary },
                  ]} />
                </TouchableOpacity>
                {(transcript || aiTranscript) ? (
                  <Text style={[styles.miniTranscript, { color: colors.textTertiary }]} numberOfLines={1}>
                    {voiceState === 'listening' ? transcript : aiTranscript}
                  </Text>
                ) : null}
              </View>

              {visibleWidgets.map(renderWidget)}
            </ScrollView>
          )}

          {options.length > 0 && (
            <OptionCards options={options} onSelect={handleOptionSelect} />
          )}
        </View>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.dangerLight, borderColor: 'rgba(239,68,68,0.15)' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Input area */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.cardBg, color: colors.textPrimary, borderColor: colors.border }]}
              value={textInput}
              onChangeText={updateTextInput}
              placeholder={isConnected ? 'Or type here...' : 'What would you like to do?'}
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={(e) => handleTextSubmit(e?.nativeEvent?.text || undefined)}
              returnKeyType="send"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.accent }, (!textInput.trim() || isLoading) && [styles.sendButtonDisabled, { backgroundColor: colors.cardBg, borderColor: colors.border }]]}
              onPress={() => handleTextSubmit()}
              disabled={!textInput.trim() || isLoading}
            >
              <Text style={[styles.sendIcon, { color: colors.textPrimary }]}>{'↑'}</Text>
            </TouchableOpacity>
          </View>

          {/* Suggestion chips */}
          {!isConnected && widgets.length === 0 && !displayText && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsRow}
              contentContainerStyle={styles.suggestionsContent}
            >
              {[
                'Get a ride',
                'Order food',
                'Play music',
                'Set a timer',
                'Weather',
                'Shop online',
              ].map((text, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionChip, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={() => handleTextSubmit(text)}
                >
                  <Text style={[styles.suggestionText, { color: colors.textTertiary }]}>{text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      <SettingsPanel
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        gatewayStatus={gateway.status}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════
// Root App Wrapper
// ═══════════════════════════════════════════════════════
export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

// ═══════════════════════════════════════════════════════
// Styles (Dynamic overrides injected directly into components)
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
    justifyContent: 'center',
  },
  orbArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: T.s7,
  },
  aiTextBubble: {
    marginTop: T.s6,
    borderRadius: T.radiusSm,
    paddingHorizontal: T.s5,
    paddingVertical: T.s4,
    maxWidth: SCREEN_WIDTH - 64,
    borderWidth: 1,
  },
  aiText: {
    fontSize: T.fontBase,
    fontWeight: T.light,
    lineHeight: 22,
    textAlign: 'center',
  },
  globalActivityPill: {
    position: 'absolute',
    top: T.s8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: T.s5,
    paddingVertical: T.s3,
    borderRadius: T.radiusFull,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  globalActivityText: {
    fontSize: T.fontSm,
    fontWeight: T.medium,
    textTransform: 'uppercase',
    letterSpacing: T.trackingWide,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: T.s5,
  },
  loadingText: {
    fontSize: T.fontXs,
    fontWeight: T.semibold,
    letterSpacing: T.trackingWidest,
    marginLeft: T.s2,
  },
  widgetStack: {
    flex: 1,
  },
  widgetStackContent: {
    paddingVertical: T.s3,
    gap: T.s3,
  },
  miniOrbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: T.s5,
    marginBottom: T.s2,
  },
  miniOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: T.s3,
    borderWidth: 1,
  },
  miniOrbDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  miniTranscript: {
    fontSize: T.fontSm,
    fontWeight: T.light,
    flex: 1,
  },
  errorContainer: {
    marginHorizontal: T.s4,
    marginBottom: T.s2,
    padding: T.s3,
    borderRadius: T.radiusSm,
    borderWidth: 1,
  },
  errorText: {
    fontSize: T.fontSm,
    textAlign: 'center',
  },
  inputArea: {
    paddingHorizontal: T.s4,
    paddingBottom: Platform.OS === 'ios' ? T.s2 : T.s4,
    paddingTop: T.s2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 48,
    borderRadius: T.radiusFull,
    paddingHorizontal: T.s5,
    fontSize: T.fontMd,
    fontWeight: T.light,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: T.s2,
  },
  sendButtonDisabled: {
    borderWidth: 1,
  },
  sendIcon: {
    fontSize: T.fontLg,
    fontWeight: T.bold,
  },
  suggestionsRow: {
    marginTop: T.s3,
  },
  suggestionsContent: {
    gap: T.s2,
    paddingRight: T.s2,
  },
  suggestionChip: {
    borderRadius: T.radiusFull,
    paddingHorizontal: T.s4,
    paddingVertical: T.s2,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: T.fontSm,
    fontWeight: T.medium,
  },
});
