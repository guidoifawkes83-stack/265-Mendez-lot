import { google } from 'googleapis';

async function logToSheet(property, userMessage, botResponse) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: '18BnlvURLxzS___WUA6tPFpE81IiUBQWN2W5LTrYInDE',
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          new Date().toISOString(),
          property,
          '',
          userMessage,
          botResponse,
          ''
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

    // Log the conversation to Google Sheets
    const userMessage = messages[messages.length - 1]?.content || '';
    const botResponse = data?.content?.[0]?.text || '';
    await logToSheet(property, userMessage, botResponse);

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
