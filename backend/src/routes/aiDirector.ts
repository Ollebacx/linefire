/**
 * POST /ai/director
 *
 * Body: { round: number; kills: number; combo: number; waveSummary?: string }
 * Returns: { commentary: string }
 *
 * Proxies the prompt to Google Gemini and returns a short wave-director
 * commentary line (≤ 2 sentences).
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

export const aiDirectorRoute = new Hono();

const BodySchema = z.object({
  round:        z.number().int().min(1),
  kills:        z.number().int().min(0),
  combo:        z.number().int().min(0),
  waveSummary:  z.string().max(200).optional(),
});

const client = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const MODEL = 'gemini-2.0-flash';

aiDirectorRoute.post('/director', async c => {
  if (!client) {
    return c.json({ commentary: 'The AI director is offline. GEMINI_API_KEY not set.' }, 200);
  }

  const parsed = BodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { round, kills, combo, waveSummary } = parsed.data;

  const systemPrompt = `You are a cynical military game commentator for a top-down squad shooter called Linefire. 
Give a very short (1-2 sentences max), punchy, darkly humorous commentary on the player's performance this wave.
Be terse and tactical. No emojis. Direct second-person address.`;

  const userPrompt = `Wave ${round} complete.
Kills this wave: ${kills}.
Highest combo: ${combo}.${waveSummary ? `\nExtra context: ${waveSummary}` : ''}`;

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: { systemInstruction: systemPrompt, maxOutputTokens: 80, temperature: 0.9 },
    });
    const text = response.text ?? 'No commentary available.';
    return c.json({ commentary: text.trim() });
  } catch (err) {
    console.error('Gemini error:', err);
    return c.json({ commentary: 'The director has gone dark. Carry on.' }, 200);
  }
});
