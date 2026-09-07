import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Default LINE Channel Access Token provided by user
const DEFAULT_LINE_TOKEN = 
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  'A3MYk1t4yDEYlqdELn6tu3DLHYlFLe4fOTht/6/HFCRB5SAuRl/3xLydLY2ucXjU5LERtRy7GBFjZKO4iydoPP6HQM7FqW+PF0UeMTeRddVYOz1ULrGSjnjieJh9KKvcm+ryfDjouZSEA9/wIwM+IwdB04t89/1O/w1cDnyilFU=';

// Helper to get active token
function getActiveLineToken(customToken?: string): string {
  const t = (customToken && customToken.trim()) || DEFAULT_LINE_TOKEN;
  return t.trim();
}

// -------------------------------------------------------------
// LINE Bot API Endpoints
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// 2. LINE Bot info & quota
app.get('/api/line/bot-info', async (req: Request, res: Response) => {
  try {
    const token = getActiveLineToken(req.query.token as string);
    if (!token) {
      res.status(400).json({ error: 'LINE Channel Access Token is missing' });
      return;
    }

    // Call LINE bot info
    const infoResp = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!infoResp.ok) {
      const errText = await infoResp.text();
      res.status(infoResp.status).json({ 
        error: 'Failed to fetch LINE bot info', 
        details: errText 
      });
      return;
    }

    const botInfo = await infoResp.json();

    // Call LINE bot quota
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

    res.json({
      success: true,
      bot: botInfo,
      quota,
      tokenMasked: `${token.substring(0, 10)}...${token.substring(token.length - 8)}`
    });
  } catch (err: any) {
    console.error('LINE bot info error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 3. Send arbitrary LINE message (Push or Broadcast)
app.post('/api/line/send', async (req: Request, res: Response) => {
  try {
    const { to, messages, broadcast, token: customToken } = req.body;
    const token = getActiveLineToken(customToken);

    if (!token) {
      res.status(400).json({ error: 'LINE Channel Access Token is missing' });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    let endpoint = '';
    let body: any = {};

    if (to && typeof to === 'string' && to.trim()) {
      // Push message to specific user / group
      endpoint = 'https://api.line.me/v2/bot/message/push';
      body = { to: to.trim(), messages };
    } else if (broadcast === true) {
      // Broadcast to all friends of the OA
      endpoint = 'https://api.line.me/v2/bot/message/broadcast';
      body = { messages };
    } else {
      // If neither target nor broadcast, perform validation check to verify syntax
      endpoint = 'https://api.line.me/v2/bot/message/validate/broadcast';
      body = { messages };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const respText = await response.text();
    let respData = {};
    try {
      respData = respText ? JSON.parse(respText) : {};
    } catch {
      respData = { raw: respText };
    }

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        error: 'LINE API returned an error',
        details: respData
      });
      return;
    }

    res.json({
      success: true,
      mode: endpoint.includes('broadcast') ? (broadcast ? 'broadcast' : 'validated') : 'push',
      target: to || (broadcast ? 'all_friends' : 'validated_syntax'),
      result: respData
    });
  } catch (err: any) {
    console.error('LINE send error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 4. Send Bill Reminder (Rich Flex Message)
app.post('/api/line/send-bill', async (req: Request, res: Response) => {
  try {
    const { 
      bill, 
      property, 
      targetUserId, 
      broadcast = false, 
      customMessage,
      token: customToken 
    } = req.body;

    const token = getActiveLineToken(customToken);

    if (!bill) {
      res.status(400).json({ error: 'Bill data is required' });
      return;
    }

    // Build the gorgeous Flex Message Bubble
    const flexMessage = createBillFlexMessage(bill, property, customMessage);

    const messages = [flexMessage];

    let endpoint = '';
    let payload: any = {};

    if (targetUserId && targetUserId.trim()) {
      endpoint = 'https://api.line.me/v2/bot/message/push';
      payload = { to: targetUserId.trim(), messages };
    } else if (broadcast) {
      endpoint = 'https://api.line.me/v2/bot/message/broadcast';
      payload = { messages };
    } else {
      // Validate structure if no target is specified yet
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
    let respData = {};
    try {
      respData = respText ? JSON.parse(respText) : {};
    } catch {
      respData = { raw: respText };
    }

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        error: 'LINE API returned an error',
        details: respData
      });
      return;
    }

    res.json({
      success: true,
      mode: endpoint.includes('broadcast') ? (broadcast ? 'broadcast' : 'validated') : 'push',
      recipient: targetUserId || (broadcast ? 'all_friends' : 'syntax_validated'),
      flexMessage
    });
  } catch (err: any) {
    console.error('LINE send-bill error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Helper to format currency
function formatMoney(amount: number): string {
  return (amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Helper to format date in Thai
function formatDateThai(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10) + 543;
    const months = [
      '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const m = months[parseInt(parts[1], 10)] || parts[1];
    const d = parseInt(parts[2], 10);
    return `${d} ${m} ${y}`;
  }
  return dateStr;
}

// Helper to construct the gorgeous LINE Flex Message
function createBillFlexMessage(bill: any, property: any, customNote?: string) {
  const roomNumber = bill.roomNumber || 'ไม่ระบุ';
  const tenantName = bill.tenantName || 'ผู้เช่า';
  const grandTotal = formatMoney(bill.grandTotal);
  const dueDateStr = formatDateThai(bill.dueDate);
  const propertyName = property?.name || 'StayFlow หอพัก/อพาร์ตเมนต์';
  const promptPay = property?.promptPayId || '-';
  const bankName = property?.bankName || '';
  const bankAccount = property?.bankAccount || '';

  const isOverdue = bill.paymentStatus === 'overdue';
  const headerStatusText = isOverdue ? '⚠️ เกินกำหนดชำระ' : '🔔 ถึงกำหนดชำระแล้ว';
  const headerStatusColor = isOverdue ? '#DC2626' : '#E11D48';

  // Construct item rows
  const itemRows: any[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '1. ค่าเช่าห้องพัก', size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.roomRentAmount)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `2. ค่าน้ำประปา (${bill.waterUnits || 0} หน่วย)`, size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.waterAmount)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `3. ค่าไฟฟ้า (${bill.elecUnits || 0} หน่วย)`, size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.elecAmount)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    }
  ];

  if (bill.commonFee && bill.commonFee > 0) {
    itemRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '4. ค่าส่วนกลาง', size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.commonFee)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    });
  }

  if (bill.internetFee && bill.internetFee > 0) {
    itemRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '5. ค่าอินเทอร์เน็ต', size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.internetFee)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    });
  }

  if (bill.parkingFee && bill.parkingFee > 0) {
    itemRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '6. ค่าที่จอดรถ', size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.parkingFee)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    });
  }

  if (bill.trashFee && bill.trashFee > 0) {
    itemRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '7. ค่าขยะ', size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.trashFee)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    });
  }

  if (bill.otherFees && bill.otherFees > 0) {
    itemRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `8. ${bill.otherFeesNote || 'ค่าบริการอื่นๆ'}`, size: 'xs', color: '#475569', flex: 6 },
        { type: 'text', text: `฿ ${formatMoney(bill.otherFees)}`, size: 'xs', color: '#0F172A', weight: 'bold', align: 'end', flex: 4 }
      ]
    });
  }

  if (bill.discount && bill.discount > 0) {
    itemRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: 'ส่วนลดพิเศษ', size: 'xs', color: '#10B981', flex: 6 },
        { type: 'text', text: `- ฿ ${formatMoney(bill.discount)}`, size: 'xs', color: '#10B981', weight: 'bold', align: 'end', flex: 4 }
      ]
    });
  }

  return {
    type: 'flex',
    altText: `📋 แจ้งเตือนกำหนดชำระค่าห้องพัก ${roomNumber} ยอด ฿${grandTotal} (${propertyName})`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F172A',
        paddingAll: '20px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: `🏢 ${propertyName}`,
                weight: 'bold',
                color: '#CBD5E1',
                size: 'sm',
                flex: 7
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: headerStatusColor,
                cornerRadius: '12px',
                paddingStart: '10px',
                paddingEnd: '10px',
                paddingTop: '3px',
                paddingBottom: '3px',
                contents: [
                  {
                    type: 'text',
                    text: headerStatusText,
                    color: '#FFFFFF',
                    size: 'xxs',
                    weight: 'bold'
                  }
                ]
              }
            ]
          },
          {
            type: 'text',
            text: `ใบแจ้งหนี้ห้อง ${roomNumber}`,
            weight: 'bold',
            color: '#FFFFFF',
            size: 'xl',
            margin: 'md'
          },
          {
            type: 'text',
            text: `ประจำรอบเดือน: ${bill.monthYear || 'ปัจจุบัน'} • เลขที่บิล: ${bill.billNumber || '-'}`,
            color: '#94A3B8',
            size: 'xs',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          // Grand total card
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#F8FAFC',
            cornerRadius: '14px',
            paddingAll: '16px',
            borderColor: '#E2E8F0',
            borderWidth: '1px',
            contents: [
              {
                type: 'text',
                text: 'ยอดรวมที่ต้องชำระทั้งสิ้น',
                size: 'xs',
                color: '#64748B',
                align: 'center'
              },
              {
                type: 'text',
                text: `฿ ${grandTotal}`,
                size: 'xxl',
                weight: 'bold',
                color: '#0F172A',
                align: 'center',
                margin: 'xs'
              },
              {
                type: 'box',
                layout: 'horizontal',
                justifyContent: 'center',
                margin: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: `📅 กำหนดชำระภายใน: ${dueDateStr}`,
                    size: 'xs',
                    color: '#DC2626',
                    weight: 'bold'
                  }
                ]
              }
            ]
          },

          // Tenant info
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'xs',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '👤 ผู้เช่า', size: 'xs', color: '#64748B', flex: 3 },
                  { type: 'text', text: `${tenantName} (ห้อง ${roomNumber})`, size: 'xs', color: '#1E293B', weight: 'bold', flex: 7, align: 'end' }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: '📞 เบอร์โทร', size: 'xs', color: '#64748B', flex: 3 },
                  { type: 'text', text: bill.tenantPhone || '-', size: 'xs', color: '#1E293B', flex: 7, align: 'end' }
                ]
              }
            ]
          },

          { type: 'separator', margin: 'md', color: '#E2E8F0' },

          // Breakdown title
          {
            type: 'text',
            text: '📊 รายการค่าน้ำ ค่าไฟ และค่าเช่า',
            size: 'xs',
            weight: 'bold',
            color: '#334155',
            margin: 'md'
          },

          // Itemized rows
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            spacing: 'xs',
            contents: itemRows
          },

          { type: 'separator', margin: 'md', color: '#E2E8F0' },

          // Payment accounts
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            paddingAll: '12px',
            backgroundColor: '#F0FDF4',
            cornerRadius: '10px',
            borderColor: '#BBF7D0',
            borderWidth: '1px',
            contents: [
              {
                type: 'text',
                text: '💳 ช่องทางการชำระเงิน',
                size: 'xs',
                weight: 'bold',
                color: '#166534'
              },
              ...(promptPay ? [{
                type: 'text',
                text: `📲 พร้อมเพย์: ${promptPay} (${property?.promptPayName || propertyName})`,
                size: 'xs',
                color: '#15803D',
                margin: 'xs'
              }] : []),
              ...(bankName && bankAccount ? [{
                type: 'text',
                text: `🏦 ธนาคาร: ${bankName} ${bankAccount} (${property?.bankAccountName || propertyName})`,
                size: 'xs',
                color: '#15803D',
                margin: 'xxs'
              }] : [])
            ]
          },

          // Optional custom note
          ...(customNote ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            paddingAll: '10px',
            backgroundColor: '#FEF3C7',
            cornerRadius: '8px',
            contents: [
              {
                type: 'text',
                text: `💬 ข้อความจากหอพัก: ${customNote}`,
                size: 'xs',
                color: '#92400E',
                wrap: true
              }
            ]
          }] : [])
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        backgroundColor: '#F8FAFC',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'uri',
              label: '💬 ส่งสลิปแจ้งโอน / ติดต่อหอพัก',
              uri: property?.lineId 
                ? (property.lineId.startsWith('@') ? `https://line.me/R/ti/p/${property.lineId}` : `https://line.me/R/ti/p/@${property.lineId}`)
                : 'https://line.me/R/ti/p/@141xvjme'
            }
          }
        ]
      }
    }
  };
}

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StayFlow] Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
