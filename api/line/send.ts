const DEFAULT_LINE_TOKEN = 
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  'A3MYk1t4yDEYlqdELn6tu3DLHYlFLe4fOTht/6/HFCRB5SAuRl/3xLydLY2ucXjU5LERtRy7GBFjZKO4iydoPP6HQM7FqW+PF0UeMTeRddVYOz1ULrGSjnjieJh9KKvcm+ryfDjouZSEA9/wIwM+IwdB04t89/1O/w1cDnyilFU=';

function getActiveLineToken(customToken?: string): string {
  const t = (customToken && customToken.trim()) || DEFAULT_LINE_TOKEN;
  return t.trim();
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { to, messages, broadcast, token: customToken } = body;
    const token = getActiveLineToken(customToken);

    if (!token) {
      return res.status(400).json({ error: 'LINE Channel Access Token is missing' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let endpoint = '';
    let payload: any = {};

    if (to && typeof to === 'string' && to.trim()) {
      // Push message to specific user / group
      endpoint = 'https://api.line.me/v2/bot/message/push';
      payload = { to: to.trim(), messages };
    } else if (broadcast === true) {
      // Broadcast to all friends of the OA
      endpoint = 'https://api.line.me/v2/bot/message/broadcast';
      payload = { messages };
    } else {
      // If neither target nor broadcast, perform validation check to verify syntax
      endpoint = 'https://api.line.me/v2/bot/message/validate/broadcast';
      payload = { messages };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const respText = await response.text();
    let respData: any = {};
    try {
      respData = respText ? JSON.parse(respText) : {};
    } catch {
      respData = { raw: respText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: respData?.message || 'LINE API returned an error',
        details: respData
      });
    }

    return res.status(200).json({
      success: true,
      mode: endpoint.includes('broadcast') ? (broadcast ? 'broadcast' : 'validated') : 'push',
      target: to || (broadcast ? 'all_friends' : 'validated_syntax'),
      result: respData
    });
  } catch (err: any) {
    console.error('Vercel LINE send error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
