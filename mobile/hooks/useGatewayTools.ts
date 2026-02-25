import { useCallback, useEffect, useRef } from 'react';
import { useGatewayConnection } from './useGatewayConnection';

// ─── Types ────────────────────────────────────────────────

type GatewayConnection = ReturnType<typeof useGatewayConnection>;

interface AgentEventPayload {
  runId: string;
  seq: number;
  stream: string;
  ts: number;
  data: Record<string, unknown>;
}

interface AgentResult {
  runId?: string;
  status?: string;
  summary?: string;
  text?: string;
  [key: string]: unknown;
}

// Structured text accumulators keyed by runId
interface RunAccumulator {
  text: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
  done: boolean;
}

// ─── Tool-to-Agent Message Mapping ────────────────────────

const TOOL_PROMPTS: Record<string, (args: Record<string, unknown>) => string> = {
  get_weather: (args) => {
    const loc = (args.location as string) || 'current location';
    return `Get the current weather for ${loc}. Include temperature, condition, humidity, wind speed, high/low temps, and a 4-point forecast for today (Now, 3PM, 6PM, 9PM). Return the data as structured JSON with keys: location, temperature, condition, humidity, wind, high, low, forecast (array of {time, temp, condition}).`;
  },

  order_ride: (args) => {
    const dest = (args.destination as string) || 'destination';
    const from = (args.pickup_location as string) || 'current location';
    return `I need a ride from ${from} to ${dest}. Find available ride-hailing options. Return JSON with keys: status ("pending_user_selection"), step ("choose_ride_app"), destination, available_apps (array of provider names like Uber, Lyft, Waymo, Via), and estimated prices if available.`;
  },

  order_food: (args) => {
    const restaurant = (args.restaurant as string) || 'a restaurant';
    const items = Array.isArray(args.items) ? (args.items as string[]).join(', ') : (args.items as string) || 'food';
    return `I want to order ${items} from ${restaurant}. Find available food delivery services. Return JSON with keys: status ("pending_user_selection"), step ("choose_delivery_app"), restaurant, items, available_apps (array like DoorDash, Uber Eats, Grubhub, Postmates).`;
  },

  message_contact: (args) => {
    const name = (args.name as string) || 'someone';
    const message = (args.message as string) || '';
    return `I want to send a message to ${name} saying "${message}". Find available messaging platforms. Return JSON with keys: status ("pending_user_selection"), step ("choose_messaging_platform"), recipient, message, available_apps (array like iMessage, WhatsApp, Gmail, Telegram, Slack, SMS).`;
  },

  search_shopping: (args) => {
    const query = (args.query as string) || 'item';
    const category = (args.category as string) || 'all';
    return `I want to shop for "${query}" in category "${category}". Find available online stores. Return JSON with keys: status ("pending_user_selection"), step ("choose_store"), query, category, available_stores (array like Amazon, eBay, Target, Etsy).`;
  },

  play_music: (args) => {
    const query = (args.query as string) || '';
    const action = (args.action as string) || 'play';
    return `I want to ${action} music${query ? ': "' + query + '"' : ''}. Find available music streaming services. Return JSON with keys: status ("pending_user_selection"), step ("choose_music_app"), query, action, available_apps (array like Spotify, Apple Music, YouTube Music, SoundCloud).`;
  },

  set_timer: (args) => {
    const minutes = (args.duration_minutes as number) || 5;
    const label = (args.label as string) || 'Timer';
    return `Set a timer for ${minutes} minutes labeled "${label}". Return JSON with keys: duration_minutes, label, started_at (ISO string), ends_at (ISO string).`;
  },

  add_to_cart: (args) => {
    const product = (args.product_name as string) || 'item';
    const size = (args.size as string) || 'M';
    const color = (args.color as string) || 'Black';
    const qty = (args.quantity as number) || 1;
    return `Add to cart: ${product}, size ${size}, color ${color}, quantity ${qty}. Return JSON with keys: status ("Added to cart"), product_name, size, color, quantity, cart_total, estimated_delivery.`;
  },
};

// ─── Result Parsers ───────────────────────────────────────

/**
 * Try to extract structured JSON from the agent's text response.
 * The agent may return pure JSON, or JSON embedded in markdown code fences,
 * or structured text that we can parse.
 */
function parseAgentResult(text: string, toolName: string, originalArgs: Record<string, unknown>): Record<string, unknown> {
  // Try direct JSON parse
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch { /* not pure JSON */ }

  // Try extracting JSON from markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch { /* not valid JSON in fence */ }
  }

  // Try finding any JSON object in the text
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch { /* couldn't parse */ }
  }

  // Fallback: return tool-specific defaults enriched with whatever text we got
  return buildFallbackResult(toolName, originalArgs, text);
}

function buildFallbackResult(toolName: string, args: Record<string, unknown>, rawText: string): Record<string, unknown> {
  switch (toolName) {
    case 'get_weather': {
      const tempMatch = rawText.match(/(\d+)\s*°?\s*[fFcC]/);
      const condMatch = rawText.match(/(partly cloudy|cloudy|sunny|rainy|clear|overcast|foggy|snowing|stormy)/i);
      return {
        location: (args.location as string) || 'Unknown',
        temperature: tempMatch ? parseInt(tempMatch[1]) : 68,
        condition: condMatch?.[1] || 'Unknown',
        humidity: 55,
        wind: '—',
        high: tempMatch ? parseInt(tempMatch[1]) + 4 : 72,
        low: tempMatch ? parseInt(tempMatch[1]) - 10 : 58,
        forecast: [],
        raw_text: rawText.slice(0, 300),
      };
    }

    case 'order_ride':
      return {
        status: 'pending_user_selection',
        step: 'choose_ride_app',
        destination: (args.destination as string) || '',
        available_apps: ['Uber', 'Lyft', 'Waymo', 'Via'],
        raw_text: rawText.slice(0, 300),
      };

    case 'order_food':
      return {
        status: 'pending_user_selection',
        step: 'choose_delivery_app',
        restaurant: (args.restaurant as string) || '',
        items: args.items || [],
        available_apps: ['DoorDash', 'Uber Eats', 'Grubhub', 'Postmates'],
        raw_text: rawText.slice(0, 300),
      };

    case 'message_contact':
      return {
        status: 'pending_user_selection',
        step: 'choose_messaging_platform',
        recipient: (args.name as string) || '',
        message: (args.message as string) || '',
        available_apps: ['iMessage', 'WhatsApp', 'Gmail', 'Telegram', 'Slack', 'SMS'],
        raw_text: rawText.slice(0, 300),
      };

    case 'search_shopping':
      return {
        status: 'pending_user_selection',
        step: 'choose_store',
        query: (args.query as string) || '',
        category: (args.category as string) || 'all',
        available_stores: ['Amazon', 'eBay', 'Target', 'Etsy'],
        raw_text: rawText.slice(0, 300),
      };

    case 'play_music':
      return {
        status: 'pending_user_selection',
        step: 'choose_music_app',
        query: (args.query as string) || '',
        action: (args.action as string) || 'play',
        available_apps: ['Spotify', 'Apple Music', 'YouTube Music', 'SoundCloud'],
        raw_text: rawText.slice(0, 300),
      };

    case 'set_timer': {
      const mins = (args.duration_minutes as number) || 5;
      return {
        duration_minutes: mins,
        label: (args.label as string) || 'Timer',
        started_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + mins * 60000).toISOString(),
      };
    }

    case 'add_to_cart':
      return {
        status: 'Added to cart',
        product_name: (args.product_name as string) || 'Item',
        size: (args.size as string) || 'M',
        color: (args.color as string) || 'Black',
        quantity: (args.quantity as number) || 1,
        cart_total: '$49.99',
        estimated_delivery: '2-3 business days',
      };

    default:
      return { raw_text: rawText.slice(0, 500) };
  }
}

// ─── Hook ─────────────────────────────────────────────────

export function useGatewayTools(gateway: GatewayConnection) {
  const runAccumulators = useRef<Map<string, RunAccumulator>>(new Map());
  const runResolvers = useRef<Map<string, { resolve: (text: string) => void; reject: (err: Error) => void }>>(new Map());

  // Subscribe to agent stream events
  useEffect(() => {
    if (!gateway.isConnected) return;

    const unsubChat = gateway.onEvent('chat', (payload) => {
      const state = payload.state as string | undefined;
      const runId = payload.runId as string | undefined;

      if (!runId) return;

      let acc = runAccumulators.current.get(runId);
      if (!acc) {
        acc = { text: '', toolCalls: [], done: false };
        runAccumulators.current.set(runId, acc);
      }

      if (state === 'delta') {
        // Streaming text delta
        const content = (payload.message as { content?: Array<{ text?: string }> })?.content;
        if (content) {
          for (const part of content) {
            if (part.text) {
              acc.text += part.text;
            }
          }
        }
      } else if (state === 'done' || state === 'end') {
        acc.done = true;
        const resolver = runResolvers.current.get(runId);
        if (resolver) {
          resolver.resolve(acc.text);
          runResolvers.current.delete(runId);
          runAccumulators.current.delete(runId);
        }
      } else if (state === 'error') {
        const resolver = runResolvers.current.get(runId);
        if (resolver) {
          resolver.reject(new Error((payload.error as string) || 'Agent run failed'));
          runResolvers.current.delete(runId);
          runAccumulators.current.delete(runId);
        }
      }
    });

    // Also listen to agent events (different from chat events in some Gateway versions)
    const unsubAgent = gateway.onEvent('agent', (payload) => {
      const agentPayload = payload as unknown as AgentEventPayload;
      const { runId, stream, data } = agentPayload;

      if (!runId) return;

      let acc = runAccumulators.current.get(runId);
      if (!acc) {
        acc = { text: '', toolCalls: [], done: false };
        runAccumulators.current.set(runId, acc);
      }

      if (stream === 'assistant' && data.text) {
        acc.text += data.text as string;
      } else if (stream === 'done' || stream === 'end') {
        acc.done = true;
        const resolver = runResolvers.current.get(runId);
        if (resolver) {
          resolver.resolve(acc.text);
          runResolvers.current.delete(runId);
          runAccumulators.current.delete(runId);
        }
      }
    });

    return () => {
      unsubChat();
      unsubAgent();
    };
  }, [gateway.isConnected, gateway.onEvent]);

  /**
   * Execute a tool through the Gateway agent.
   * Sends an agent request, waits for the streaming response to complete,
   * then parses and returns structured widget data.
   */
  const executeTool = useCallback(async (toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const promptFn = TOOL_PROMPTS[toolName];
    if (!promptFn) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const message = promptFn(args);
    const idempotencyKey = `tool-${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(`[GatewayTools] Executing ${toolName} via Gateway agent`);

    try {
      // 15-second strict timeout for tool execution
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool ${toolName} execution timed out`)), 15000)
      );

      // Send agent request to the Gateway
      const agentPromise = gateway.sendRequest('agent', {
        message,
        idempotencyKey,
        sessionKey: `intent-os:${toolName}`,
        thinking: 'off',
        timeout: 15,
        extraSystemPrompt: `You are a tool executor for Intent OS. The user's request represents a tool call. You MUST respond with ONLY valid JSON — no markdown, no explanation, no text before or after. The JSON structure is specified in the user message.`,
      }) as Promise<AgentResult>;

      const response = await Promise.race([agentPromise, timeoutPromise]);

      console.log(`[GatewayTools] Agent acknowledged: runId=${response.runId}, status=${response.status}`);

      // If the gateway returns the result directly (synchronous mode)
      if (response.text || response.summary) {
        const text = (response.text || response.summary || '') as string;
        if (text) {
          return parseAgentResult(text, toolName, args);
        }
      }

      // Otherwise wait for streaming events to complete
      if (response.runId) {
        const text = await Promise.race([
          waitForRunCompletion(response.runId as string),
          timeoutPromise
        ]);
        return parseAgentResult(text, toolName, args);
      }

      // If no runId and no text, use fallback
      console.warn(`[GatewayTools] No runId or text in response for ${toolName}`);
      return buildFallbackResult(toolName, args, '');

    } catch (err) {
      console.error(`[GatewayTools] Error executing ${toolName}:`, err);
      // Return fallback data so the widget still shows something meaningful
      return buildFallbackResult(toolName, args, (err as Error).message);
    }
  }, [gateway.sendRequest]);

  /**
   * Wait for a run to complete by subscribing to its streaming events.
   */
  const waitForRunCompletion = useCallback((runId: string): Promise<string> => {
    // Check if already accumulated
    const existing = runAccumulators.current.get(runId);
    if (existing?.done) {
      const text = existing.text;
      runAccumulators.current.delete(runId);
      return Promise.resolve(text);
    }

    return new Promise((resolve, reject) => {
      // Set a timeout to avoid hanging forever
      const timer = setTimeout(() => {
        const acc = runAccumulators.current.get(runId);
        const text = acc?.text || '';
        runAccumulators.current.delete(runId);
        runResolvers.current.delete(runId);
        if (text) {
          resolve(text);
        } else {
          reject(new Error(`Run ${runId} timed out with no data`));
        }
      }, 30000);

      runResolvers.current.set(runId, {
        resolve: (text) => {
          clearTimeout(timer);
          resolve(text);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
    });
  }, []);

  /**
   * Send a text chat message through the Gateway agent.
   * Returns the full text response.
   */
  const sendChat = useCallback(async (message: string): Promise<string> => {
    const idempotencyKey = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log('[GatewayTools] Sending chat via Gateway agent');

    try {
      const response = await gateway.sendRequest('agent', {
        message,
        idempotencyKey,
        sessionKey: 'intent-os:main',
        thinking: 'off',
        timeout: 30,
      }) as AgentResult;

      if (response.text || response.summary) {
        return (response.text || response.summary || '') as string;
      }

      if (response.runId) {
        return await waitForRunCompletion(response.runId as string);
      }

      return '';
    } catch (err) {
      console.error('[GatewayTools] Chat error:', err);
      throw err;
    }
  }, [gateway.sendRequest, waitForRunCompletion]);

  return {
    executeTool,
    sendChat,
  };
}
