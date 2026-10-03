import { google } from 'googleapis';

// Same sheet that api/chat.js already logs to ("Mendez Chat Logs", Sheet1, columns A:G)
const SHEET_ID = '18BnlvURLxzS___WUA6tPFpE81IiUBQWN2W5LTrYInDE';

const clean = (value, max) => String(value ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const name = clean(req.body?.name, 100);
  const phone = clean(req.body?.phone, 30);
  const message = clean(req.body?.message, 1000);

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          new Date().toISOString(),   // A Timestamp
          'Mendez, Cavite',           // B Property
          name,                       // C Name
          phone,                      // D Phone
          message || '(no message)',  // E User Question
          '[Inquiry form]',           // F Bot Answer (marks this row as a form submission)
          'HIGH',                     // G Intent Signal (someone left their number)
        ]],
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Inquiry logging failed:', err.message);
    // Return an error so the page does NOT tell the visitor it was sent
    return res.status(500).json({ error: 'Could not save inquiry' });
  }
}
