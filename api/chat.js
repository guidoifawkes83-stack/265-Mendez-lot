import { google } from 'googleapis';

function detectIntent(message) {
  const high = /ready to buy|want to purchase|how do i pay|when can i view|site visit|tripping|down payment|reservation|serious|interested to buy/i;
  const medium = /how much|price|cost|size|sqm|area|location|installment|terms|lot|available/i;
  if (high.test(message)) return 'HIGH';
  if (medium.test(message)) return 'MEDIUM';
  return 'LOW';
}

function extractContact(messages) {
  const fullText = messages.map(m => m.content).join(' ');
  const phone = fullText.match(/(\+?63|0)[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/)?.[0] || '';
  const nameMatch = fullText.match(/(?:my name is|i['']?m|call me)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  const name = nameMatch?.[1] || '';
  return { name, phone };
}

async function logToSheet(property, userMessage, botResponse, name, phone, intentSignal) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: '18BnlvURLxzS___WUA6tPFpE81IiUBQWN2W5LTrYInDE',
      range: 'Sheet1!A:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          new Date().toISOString(),
          property,
          name,
          phone,
          userMessage,
          botResponse,
          intentSignal
        ]],
      },
    });
  } catch (err) {
    console.error('Sheet logging failed:', err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;
  const property = 'Mendez, Cavite';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: system,
        messages: messages
      })
    });

    const data = await response.json();

    const userMessage = messages[messages.length - 1]?.content || '';
    const botResponse = data?.content?.[0]?.text || '';
    const intentSignal = detectIntent(userMessage);
    const { name, phone } = extractContact(messages);

    await logToSheet(property, userMessage, botResponse, name, phone, intentSignal);

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
