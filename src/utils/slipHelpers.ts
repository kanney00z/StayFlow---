// Helper functions and sample mock slips for payment slip attachment

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Generate an SVG data URI simulating an official mobile banking transfer slip
export const generateSampleSlip = (
  roomNumber: string,
  amount: number,
  bank: 'kbank' | 'scb' | 'bbl' | 'promptpay',
  tenantName: string = 'ผู้เช่า'
): string => {
  const bankConfig = {
    kbank: {
      name: 'KBANK K PLUS',
      bgGradient: '#138f2d',
      headerBg: '#0f7525',
      bankIcon: 'K+',
      themeColor: '#059669',
    },
    scb: {
      name: 'SCB EASY',
      bgGradient: '#4e2a84',
      headerBg: '#3b1f66',
      bankIcon: 'SCB',
      themeColor: '#7c3aed',
    },
    bbl: {
      name: 'Bualuang mBanking',
      bgGradient: '#1e3a8a',
      headerBg: '#172554',
      bankIcon: 'BBL',
      themeColor: '#2563eb',
    },
    promptpay: {
      name: 'PromptPay Transfer',
      bgGradient: '#0f172a',
      headerBg: '#0284c7',
      bankIcon: 'PromptPay',
      themeColor: '#0284c7',
    },
  }[bank];

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const txId = `TXN${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${Math.floor(100000 + Math.random() * 900000)}`;

  const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="680" viewBox="0 0 480 680">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bankConfig.bgGradient}" />
      <stop offset="100%" stop-color="${bankConfig.headerBg}" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Background card -->
  <rect width="480" height="680" rx="28" fill="#ffffff" filter="url(#shadow)" />
  
  <!-- Header Bar -->
  <rect width="480" height="130" rx="28" fill="url(#headerGrad)" />
  <rect y="100" width="480" height="30" fill="url(#headerGrad)" />
  
  <!-- Header text -->
  <circle cx="50" cy="65" r="22" fill="#ffffff" opacity="0.25" />
  <text x="50" y="72" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">${bankConfig.bankIcon}</text>
  
  <text x="85" y="60" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">${bankConfig.name}</text>
  <text x="85" y="80" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#d1fae5">โอนเงินสำเร็จ (Successful Transfer)</text>
  
  <text x="440" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#e2e8f0" text-anchor="end">${dateStr} ${timeStr}</text>

  <!-- Success Check Icon Badge -->
  <circle cx="240" cy="175" r="28" fill="${bankConfig.themeColor}" />
  <path d="M228 175 L237 184 L253 166" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" />

  <!-- Amount -->
  <text x="240" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">จำนวนเงินที่โอน</text>
  <text x="240" y="278" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" fill="#0f172a" text-anchor="middle">฿${formattedAmount}</text>
  
  <!-- Divider -->
  <line x1="40" y1="310" x2="440" y2="310" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4 4" />

  <!-- Transfer Details -->
  <!-- Sender -->
  <text x="50" y="345" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#94a3b8">จาก (From)</text>
  <text x="50" y="368" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#1e293b">${tenantName} (ห้อง ${roomNumber})</text>
  <text x="50" y="388" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#64748b">xxx-x-xx123-x</text>

  <!-- Arrow -->
  <path d="M240 370 L240 395 M235 390 L240 395 L245 390" stroke="${bankConfig.themeColor}" stroke-width="2.5" stroke-linecap="round" fill="none" />

  <!-- Receiver -->
  <text x="50" y="430" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#94a3b8">ไปยัง (To)</text>
  <text x="50" y="453" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#1e293b">หอพัก / อพาร์ทเมนท์</text>
  <text x="50" y="473" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#64748b">พร้อมเพย์ / บัญชีหลักหอพัก</text>

  <!-- Divider -->
  <line x1="40" y1="500" x2="440" y2="500" stroke="#f1f5f9" stroke-width="1.5" />

  <!-- Reference & Memo -->
  <text x="50" y="530" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#94a3b8">เลขที่รายการ (Ref No.)</text>
  <text x="430" y="530" font-family="Courier, monospace" font-size="12" font-weight="bold" fill="#334155" text-anchor="end">${txId}</text>

  <text x="50" y="560" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#94a3b8">บันทึกช่วยจำ (Memo)</text>
  <text x="430" y="560" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#0284c7" text-anchor="end">ค่าเช่าห้อง ${roomNumber}</text>

  <!-- Security QR / Footer Note -->
  <rect x="40" y="590" width="400" height="60" rx="14" fill="#f8fafc" stroke="#e2e8f0" />
  <text x="240" y="618" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">สแกนตรวจสอบสลิปได้ที่แอปพลิเคชันธนาคาร</text>
  <text x="240" y="636" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">Verified E-Slip • ${bankConfig.name}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
