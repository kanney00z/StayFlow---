import QRCode from 'qrcode';

/**
 * Calculates CRC-16 CCITT (0xFFFF, 0x1021) according to EMVCo / PromptPay standard
 */
export function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formats phone number or citizen ID / Tax ID for PromptPay Tag 29
 */
export function formatPromptPayTarget(target: string): { type: '01' | '02' | '03'; formatted: string } {
  const cleaned = target.replace(/[^0-9]/g, '');

  // 13-digit National ID or Tax ID
  if (cleaned.length === 13) {
    return { type: '02', formatted: cleaned };
  }

  // 15-digit e-Wallet
  if (cleaned.length === 15) {
    return { type: '03', formatted: cleaned };
  }

  // Phone number (e.g. 0812345678, 081-234-5678, 66812345678)
  let phone = cleaned;
  if (phone.startsWith('66') && phone.length === 11) {
    phone = '00' + phone;
  } else if (phone.startsWith('0') && (phone.length === 10 || phone.length === 9)) {
    phone = '0066' + phone.substring(1);
  } else if (phone.length === 9 && !phone.startsWith('0')) {
    phone = '0066' + phone;
  } else {
    // Default fallback
    phone = '0066' + phone.replace(/^0+/, '');
  }

  return { type: '01', formatted: phone };
}

/**
 * Builds a standard EMVCo PromptPay QR payload string
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  if (!target) return '';

  const { type, formatted } = formatPromptPayTarget(target);

  // Tag 00: Payload Format Indicator (Fixed '01')
  const tag00 = '000201';

  // Tag 01: Point of Initiation Method ('11' for static, '12' for dynamic with amount)
  const isDynamic = amount !== undefined && amount > 0;
  const tag01 = isDynamic ? '010212' : '010211';

  // Tag 29: Merchant Account Information (PromptPay)
  const aid = '0016A000000677010111';
  const targetTag = `${type}${String(formatted.length).padStart(2, '0')}${formatted}`;
  const tag29Value = `${aid}${targetTag}`;
  const tag29 = `29${String(tag29Value.length).padStart(2, '0')}${tag29Value}`;

  // Tag 53: Transaction Currency (764 = THB)
  const tag53 = '5303764';

  // Tag 54: Transaction Amount
  let tag54 = '';
  if (isDynamic && amount !== undefined) {
    const amtStr = Number(amount).toFixed(2);
    tag54 = `54${String(amtStr.length).padStart(2, '0')}${amtStr}`;
  }

  // Tag 58: Country Code ('TH')
  const tag58 = '5802TH';

  // Prepare string for CRC16 calculation
  const rawWithoutCrc = `${tag00}${tag01}${tag29}${tag53}${tag54}${tag58}6304`;
  const checksum = crc16(rawWithoutCrc);

  return `${rawWithoutCrc}${checksum}`;
}

/**
 * Generates a high-quality data URL (Base64 PNG) of the PromptPay QR code
 */
export async function generatePromptPayQRDataUrl(target: string, amount?: number): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  if (!payload) return '';

  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
