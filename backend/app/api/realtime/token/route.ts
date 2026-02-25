import { NextResponse } from 'next/server';

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

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-realtime-preview',
          modalities: ['text', 'audio'],
          voice: 'alloy',
          tool_choice: 'auto',
          instructions: `You are Intent OS — a minimal, intelligent operating system layer. The user speaks naturally and you act on their intent using tools.

CRITICAL: You MUST use tools for EVERY actionable request. NEVER answer from your own knowledge when a tool exists for the task.

RULES:
- ALWAYS call the matching tool. Do NOT answer questions about weather, time, music, rides, food, shopping, or messages without calling the tool first.
- If you need more info, ask ONE short follow-up. "Where to?" or "Which restaurant?"
- You handle: rides, food, messages, shopping, music, timers, weather.
- Be terse, warm, efficient. No filler words.
- NEVER make up data. Only report what the tool returns.

HANDLING [CONTEXT] MESSAGES:
You will receive messages starting with [CONTEXT] that describe what the user currently sees on screen. USE this information to guide your response:
- If context says "UI is showing app options" and user says a provider name (e.g. "Uber"), acknowledge: "Uber it is. Now pick a service tier."
- If context says "showing service tiers" and user says one (e.g. "XL"), acknowledge: "UberXL — looking for a driver nearby."
- If context says "searching for a driver", say something like "Hang tight, finding you a driver."
- NEVER skip ahead of the phase described in context. If options are showing, don't announce a booking.
- NEVER repeat the [CONTEXT] text back to the user. Use it silently to inform your response.

HANDLING "pending_user_selection" RESPONSES:
When a tool returns status "pending_user_selection":
1. Tell the user to pick from the options on screen. ONE short sentence.
2. NEVER announce final results (no driver names, no "booked", no ETAs).
3. NEVER make up details. The selection is still pending.

For completed results (no "pending_user_selection"), confirm in ONE short sentence.`,
          tools: [
            {
              type: 'function',
              name: 'order_ride',
              description:
                'Order a ride to a destination. Use when the user wants to go somewhere, get a cab/uber/lyft.',
              parameters: {
                type: 'object',
                properties: {
                  destination: {
                    type: 'string',
                    description: 'Where the user wants to go',
                  },
                  service: {
                    type: 'string',
                    enum: ['economy', 'premium', 'xl'],
                    description:
                      'Ride service tier. Ask the user if not specified.',
                  },
                },
                required: ['destination'],
              },
            },
            {
              type: 'function',
              name: 'order_food',
              description:
                'Order food from a restaurant. Use when the user wants food delivered.',
              parameters: {
                type: 'object',
                properties: {
                  restaurant: {
                    type: 'string',
                    description: 'Restaurant name',
                  },
                  items: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of food items to order',
                  },
                  special_instructions: {
                    type: 'string',
                    description: 'Any special instructions',
                  },
                },
                required: ['restaurant', 'items'],
              },
            },
            {
              type: 'function',
              name: 'message_contact',
              description:
                'Send a message to a contact. Use when user wants to text or message someone.',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Contact name',
                  },
                  message: {
                    type: 'string',
                    description: 'Message content',
                  },
                },
                required: ['name', 'message'],
              },
            },
            {
              type: 'function',
              name: 'search_shopping',
              description:
                'Search for products to buy online. Use when user wants to shop or buy something.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query for products',
                  },
                  category: {
                    type: 'string',
                    enum: [
                      'clothing',
                      'electronics',
                      'home',
                      'sports',
                      'other',
                    ],
                    description: 'Product category',
                  },
                },
                required: ['query'],
              },
            },
            {
              type: 'function',
              name: 'add_to_cart',
              description:
                'Add a product to the shopping cart after the user picks one from search results.',
              parameters: {
                type: 'object',
                properties: {
                  product_name: {
                    type: 'string',
                    description: 'Name of the product',
                  },
                  size: {
                    type: 'string',
                    description: 'Size (S, M, L, XL, etc.)',
                  },
                  color: {
                    type: 'string',
                    description: 'Color choice',
                  },
                  quantity: {
                    type: 'number',
                    description: 'Quantity to add',
                  },
                },
                required: ['product_name'],
              },
            },
            {
              type: 'function',
              name: 'play_music',
              description:
                'Play, pause, skip music or control volume. Use when user wants to listen to music.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description:
                      'Song, artist, or playlist name to play',
                  },
                  action: {
                    type: 'string',
                    enum: ['play', 'pause', 'skip', 'volume_up', 'volume_down'],
                    description: 'Music control action',
                  },
                },
                required: ['action'],
              },
            },
            {
              type: 'function',
              name: 'set_timer',
              description:
                'Set a timer or reminder. Use when user wants to set a countdown.',
              parameters: {
                type: 'object',
                properties: {
                  duration_minutes: {
                    type: 'number',
                    description: 'Timer duration in minutes',
                  },
                  label: {
                    type: 'string',
                    description: 'Label for the timer',
                  },
                },
                required: ['duration_minutes'],
              },
            },
            {
              type: 'function',
              name: 'get_weather',
              description:
                'Get current weather and forecast for a location.',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description:
                      'City or location. Use current location if not specified.',
                  },
                },
                required: [],
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI realtime session error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create realtime session', details: errorText },
        {
          status: response.status,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('Token generation error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
