import OpenAI from 'openai';
import type { Attachment } from 'discord.js';
import { normalize } from './math.js';
import type { ExtractedSignal } from './types.js';

const schema = { type: 'object', additionalProperties: false, required: ['symbol','direction','entryPrice','stopLoss','takeProfits','lotSize','timeframe','note'], properties: {
  symbol:{type:['string','null']}, direction:{type:['string','null'],enum:['BUY','SELL',null]}, entryPrice:{type:['number','null']}, stopLoss:{type:['number','null']}, takeProfits:{type:'array',items:{type:'number'}}, lotSize:{type:['number','null']}, timeframe:{type:['string','null']}, note:{type:['string','null']}
}} as const;

export async function analyzeScreenshots(key: string, model: string, attachments: Attachment[]): Promise<ExtractedSignal> {
  if (!key) throw new Error('OPENAI_API_KEY is not configured.');
  const client = new OpenAI({ apiKey: key });
  const images = await Promise.all(attachments.map(async a => { const response = await fetch(a.url); if (!response.ok) throw new Error(`Could not download ${a.name}`); const bytes = Buffer.from(await response.arrayBuffer()); return { type: 'input_image' as const, image_url: `data:${a.contentType || 'image/png'};base64,${bytes.toString('base64')}`, detail: 'high' as const }; }));
  const result = await client.responses.create({ model, input: [{ role:'user', content:[{type:'input_text', text:'Extract only values visibly present in the trading screenshots. Never guess. Use null for unreadable or missing values. Direction must be BUY, SELL, or null. Do not infer an entry from current price. Return exact structured data.'}, ...images] }], text:{ format:{ type:'json_schema', name:'trade_signal', strict:true, schema } } });
  return normalize(JSON.parse(result.output_text));
}
