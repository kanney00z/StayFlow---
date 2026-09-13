const DEFAULT_LINE_TOKEN = 
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  'A3MYk1t4yDEYlqdELn6tu3DLHYlFLe4fOTht/6/HFCRB5SAuRl/3xLydLY2ucXjU5LERtRy7GBFjZKO4iydoPP6HQM7FqW+PF0UeMTeRddVYOz1ULrGSjnjieJh9KKvcm+ryfDjouZSEA9/wIwM+IwdB04t89/1O/w1cDnyilFU=';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = ((req.query?.token as string) || DEFAULT_LINE_TOKEN).trim();
    if (!token) {
      return res.status(400).json({ error: 'LINE Channel Access Token is missing' });
    }

    const infoResp = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!infoResp.ok) {
      const errText = await infoResp.text();
      return res.status(infoResp.status).json({ 
        error: 'Failed to fetch LINE bot info', 
        details: errText 
      });
    }

    const botInfo = await infoResp.json();

    let quota = null;
    try {
      const quotaResp = await fetch('https://api.line.me/v2/bot/message/quota', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (quotaResp.ok) {
        quota = await quotaResp.json();
      }
    } catch {
      // Non-fatal
    }

    return res.status(200).json({
      success: true,
      bot: botInfo,
      quota,
      tokenMasked: `${token.substring(0, 10)}...${token.substring(token.length - 8)}`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
