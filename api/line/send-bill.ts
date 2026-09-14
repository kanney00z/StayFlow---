const DEFAULT_LINE_TOKEN = 
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  'A3MYk1t4yDEYlqdELn6tu3DLHYlFLe4fOTht/6/HFCRB5SAuRl/3xLydLY2ucXjU5LERtRy7GBFjZKO4iydoPP6HQM7FqW+PF0UeMTeRddVYOz1ULrGSjnjieJh9KKvcm+ryfDjouZSEA9/wIwM+IwdB04t89/1O/w1cDnyilFU=';

function getActiveLineToken(customToken?: string): string {
  const t = (customToken && customToken.trim()) || DEFAULT_LINE_TOKEN;
  return t.trim();
}

function formatMoney(amount: number): string {
  return (amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

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
          {
            type: 'text',
            text: '📊 รายการค่าน้ำ ค่าไฟ และค่าเช่า',
            size: 'xs',
            weight: 'bold',
            color: '#334155',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            spacing: 'xs',
            contents: itemRows
          },
          { type: 'separator', margin: 'md', color: '#E2E8F0' },
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

    const { 
      bill, 
      property, 
      targetUserId, 
      broadcast = false, 
      customMessage,
      token: customToken 
    } = body;

    const token = getActiveLineToken(customToken);

    if (!token) {
      return res.status(400).json({ error: 'LINE Channel Access Token is missing' });
    }

    if (!bill) {
      return res.status(400).json({ error: 'Bill data is required' });
    }

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
      recipient: targetUserId || (broadcast ? 'all_friends' : 'syntax_validated'),
      flexMessage
    });
  } catch (err: any) {
    console.error('Vercel LINE send-bill error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
