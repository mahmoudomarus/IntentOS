// DEPRECATED: Text chat now routes through the OpenClaw Gateway.
// This endpoint is kept as a fallback for when the Gateway is unavailable.
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  let { messages } = body;

  // Normalize: if messages is a string, wrap it in proper UIMessage format
  if (typeof messages === 'string') {
    messages = [{
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: messages,
      parts: [{ type: 'text' as const, text: messages }],
      createdAt: new Date(),
    }];
  }
  if (!Array.isArray(messages)) {
    return new Response('Invalid messages format', { status: 400 });
  }

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: `You are the Intent OS — a minimal, intelligent operating system layer. The user types naturally and you act on their intent using tools.

RULES:
- Always use the appropriate tool. Never just describe what you would do — act immediately.
- If you need more information, ask ONE short follow-up question. For example, "Where to?" or "Which restaurant?"
- You handle: rides, food, messages, shopping, music, timers, weather.
- Be terse, warm, efficient. No filler words.

HANDLING [CONTEXT] MESSAGES:
Messages starting with [CONTEXT] describe what the user sees on screen. Use this to guide your response:
- If context says "showing app options" and user says a provider name, acknowledge it.
- NEVER skip ahead of the current phase. If options are showing, don't announce a booking.
- NEVER repeat the [CONTEXT] text back to the user.

HANDLING "pending_user_selection" RESPONSES:
When a tool returns status "pending_user_selection":
1. Tell the user to pick from the options on screen. ONE short sentence.
2. NEVER announce a final result (like "your ride is booked" or driver details). The user hasn't chosen yet.
3. Keep it to ONE short sentence guiding them to the screen.

For completed results (no "pending_user_selection"), confirm in ONE short sentence.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
    tools: {
      order_ride: tool({
        description:
          'Order a ride to a destination. Use when the user wants to go somewhere, get a cab/uber/lyft.',
        inputSchema: z.object({
          destination: z.string().describe('Where the user wants to go'),
          service: z
            .enum(['economy', 'premium', 'xl'])
            .optional()
            .describe('Ride service tier'),
        }),
        execute: async ({ destination, service }) => ({
          driver: 'Sarah',
          car: 'Black Tesla Model 3',
          plate: '7XYZ123',
          eta: service === 'premium' ? '2 mins' : '4 mins',
          price:
            service === 'premium'
              ? '$28.00'
              : service === 'xl'
                ? '$35.00'
                : '$14.50',
          destination,
          service: service || 'economy',
          coordinates: { lat: 37.7749, lng: -122.4194 },
        }),
      }),
      order_food: tool({
        description:
          'Order food from a restaurant. Use when the user wants food delivered.',
        inputSchema: z.object({
          restaurant: z.string().describe('Restaurant name'),
          items: z.array(z.string()).describe('List of food items to order'),
          special_instructions: z
            .string()
            .optional()
            .describe('Any special instructions'),
        }),
        execute: async ({ restaurant, items, special_instructions }) => ({
          status: 'Preparing',
          total: '$' + (items.length * 12.5).toFixed(2),
          courier: 'Dave',
          eta: '15 mins',
          restaurant,
          items,
          special_instructions: special_instructions || '',
          order_id:
            'ORD-' +
            Math.random().toString(36).substr(2, 6).toUpperCase(),
        }),
      }),
      message_contact: tool({
        description:
          'Send a message to a contact. Use when user wants to text or message someone.',
        inputSchema: z.object({
          name: z.string().describe('Contact name'),
          message: z.string().describe('Message content'),
        }),
        execute: async ({ name, message }) => ({
          status: 'Delivered',
          timestamp: new Date().toISOString(),
          recipient: name,
          message,
        }),
      }),
      search_shopping: tool({
        description:
          'Search for products to buy online. Use when user wants to shop or buy something.',
        inputSchema: z.object({
          query: z.string().describe('Search query for products'),
          category: z
            .enum(['clothing', 'electronics', 'home', 'sports', 'other'])
            .optional()
            .describe('Product category'),
        }),
        execute: async ({ query, category }) => ({
          query,
          category: category || 'all',
          results: [
            {
              id: '1',
              name: `${query} - Classic Fit`,
              price: '$29.99',
              rating: 4.5,
              color: 'Black',
              sizes: ['S', 'M', 'L', 'XL'],
            },
            {
              id: '2',
              name: `${query} - Premium Edition`,
              price: '$49.99',
              rating: 4.8,
              color: 'Navy',
              sizes: ['S', 'M', 'L'],
            },
            {
              id: '3',
              name: `${query} - Sport Style`,
              price: '$34.99',
              rating: 4.2,
              color: 'White',
              sizes: ['M', 'L', 'XL'],
            },
          ],
        }),
      }),
      add_to_cart: tool({
        description:
          'Add a product to the shopping cart after the user picks one.',
        inputSchema: z.object({
          product_name: z.string().describe('Name of the product'),
          size: z.string().optional().describe('Size (S, M, L, XL, etc.)'),
          color: z.string().optional().describe('Color choice'),
          quantity: z.number().optional().describe('Quantity to add'),
        }),
        execute: async ({ product_name, size, color, quantity }) => ({
          status: 'Added to cart',
          product_name,
          size: size || 'M',
          color: color || 'Black',
          quantity: quantity || 1,
          cart_total: '$49.99',
          estimated_delivery: '2-3 business days',
        }),
      }),
      play_music: tool({
        description:
          'Play, pause, skip music or control volume. Use when user wants to listen to music.',
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe('Song, artist, or playlist name'),
          action: z
            .enum(['play', 'pause', 'skip', 'volume_up', 'volume_down'])
            .describe('Music control action'),
        }),
        execute: async ({ query, action }) => ({
          action,
          track: query || 'Blinding Lights',
          artist: query ? 'Search Result' : 'The Weeknd',
          album: 'After Hours',
          duration: '3:20',
          is_playing: action === 'play',
          progress: 0,
        }),
      }),
      set_timer: tool({
        description:
          'Set a timer or reminder. Use when user wants to set a countdown.',
        inputSchema: z.object({
          duration_minutes: z
            .number()
            .describe('Timer duration in minutes'),
          label: z
            .string()
            .optional()
            .describe('Label for the timer'),
        }),
        execute: async ({ duration_minutes, label }) => ({
          duration_minutes,
          label: label || 'Timer',
          started_at: new Date().toISOString(),
          ends_at: new Date(
            Date.now() + duration_minutes * 60000
          ).toISOString(),
        }),
      }),
      get_weather: tool({
        description:
          'Get current weather and forecast for a location.',
        inputSchema: z.object({
          location: z
            .string()
            .optional()
            .describe('City or location'),
        }),
        execute: async ({ location }) => ({
          location: location || 'San Francisco',
          temperature: 68,
          condition: 'Partly Cloudy',
          humidity: 55,
          wind: '12 mph',
          high: 72,
          low: 58,
          forecast: [
            { time: 'Now', temp: 68, condition: 'cloudy' },
            { time: '3PM', temp: 71, condition: 'sunny' },
            { time: '6PM', temp: 65, condition: 'cloudy' },
            { time: '9PM', temp: 60, condition: 'clear' },
          ],
        }),
      }),
    },
  });

  const response = result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

  return response;
}
