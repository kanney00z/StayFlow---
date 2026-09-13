// Vercel Serverless Function for /api/sync/state
let inMemoryState: any = null;

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: inMemoryState,
      updatedAt: inMemoryState?.updatedAt || null,
      serverTime: Date.now()
    });
  }

  if (req.method === 'POST') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (payload && typeof payload === 'object') {
        inMemoryState = {
          ...inMemoryState,
          ...payload,
          updatedAt: Date.now()
        };
      }
      return res.status(200).json({
        success: true,
        updatedAt: inMemoryState?.updatedAt || Date.now()
      });
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
