import { UtilityBill, PropertyProfile } from '../types';
import { formatCurrency, formatDateThai } from '../utils/formatters';

export const DEFAULT_LINE_CHANNEL_ACCESS_TOKEN = 
  'A3MYk1t4yDEYlqdELn6tu3DLHYlFLe4fOTht/6/HFCRB5SAuRl/3xLydLY2ucXjU5LERtRy7GBFjZKO4iydoPP6HQM7FqW+PF0UeMTeRddVYOz1ULrGSjnjieJh9KKvcm+ryfDjouZSEA9/wIwM+IwdB04t89/1O/w1cDnyilFU=';

export const DEFAULT_LINE_BOT_BASIC_ID = '@141xvjme';
export const DEFAULT_LINE_BOT_NAME = 'ห้องรายวันรายเดือน';

const STORAGE_KEY_LINE_TOKEN = 'stayflow_line_channel_token';
const STORAGE_KEY_LINE_TARGET = 'stayflow_line_target_id';

export function getStoredLineToken(): string {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY_LINE_TOKEN);
      if (saved && saved.trim()) return saved.trim();
    }
  } catch (err) {
    console.warn('Error reading stored LINE token:', err);
  }
  return DEFAULT_LINE_CHANNEL_ACCESS_TOKEN;
}

export function saveStoredLineToken(token: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_LINE_TOKEN, token.trim());
    }
  } catch (err) {
    console.warn('Error saving LINE token:', err);
  }
}

export function getStoredLineTargetId(): string {
  try {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(STORAGE_KEY_LINE_TARGET) || '';
    }
  } catch {
    // Ignore
  }
  return '';
}

export function saveStoredLineTargetId(id: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_LINE_TARGET, id.trim());
    }
  } catch {
    // Ignore
  }
}

export interface LineBotInfoResponse {
  success: boolean;
  bot?: {
    userId: string;
    basicId: string;
    displayName: string;
    pictureUrl?: string;
    chatMode: string;
  };
  quota?: {
    type: string;
    value: number;
  };
  tokenMasked?: string;
  error?: string;
}

export async function fetchLineBotInfo(customToken?: string): Promise<LineBotInfoResponse> {
  const token = customToken || getStoredLineToken();
  try {
    const url = `/api/line/bot-info?token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ LINE ได้'
    };
  }
}

export interface SendBillOptions {
  targetUserId?: string; // specific LINE user ID (U...) or group ID (C... / R...)
  broadcast?: boolean; // broadcast to all friends of the bot
  customNote?: string;
  token?: string;
}

export async function sendLineBillReminder(
  bill: UtilityBill,
  property: PropertyProfile,
  options: SendBillOptions = {}
): Promise<{ success: boolean; mode?: string; recipient?: string; error?: string; details?: any }> {
  try {
    const token = options.token || getStoredLineToken();
    const res = await fetch('/api/line/send-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bill,
        property,
        targetUserId: options.targetUserId,
        broadcast: options.broadcast || false,
        customMessage: options.customNote,
        token
      })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'ส่งข้อความไม่สำเร็จ'
    };
  }
}

export async function sendLineTestMessage(
  targetId?: string,
  broadcast: boolean = false,
  customToken?: string
): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const token = customToken || getStoredLineToken();
    const testFlex = {
      type: 'flex',
      altText: '🔔 ทดสอบระบบแจ้งเตือน LINE ของหอพัก',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0F172A',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: '🏢 NGR StayFlow - ระบบหอพัก',
              weight: 'bold',
              color: '#94A3B8',
              size: 'xs'
            },
            {
              type: 'text',
              text: 'ทดสอบการเชื่อมต่อ LINE สำเร็จ! 🚀',
              weight: 'bold',
              color: '#FFFFFF',
              size: 'md',
              margin: 'sm'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: 'ระบบแจ้งเตือนยอดชำระค่าน้ำค่าไฟและค่าเช่าห้องพักพร้อมใช้งานแล้ว',
              size: 'xs',
              color: '#334155',
              wrap: true
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              paddingAll: '12px',
              backgroundColor: '#F0FDF4',
              cornerRadius: '8px',
              borderColor: '#BBF7D0',
              borderWidth: '1px',
              contents: [
                {
                  type: 'text',
                  text: '✅ สถานะ: เชื่อมต่อ LINE Bot พร้อมใช้งาน',
                  size: 'xs',
                  color: '#166534',
                  weight: 'bold'
                },
                {
                  type: 'text',
                  text: 'สามารถส่งบิลสวยๆ เตือนผู้เช่าได้ทันทีเมื่อถึงกำหนดชำระ',
                  size: 'xxs',
                  color: '#15803D',
                  margin: 'xs'
                }
              ]
            }
          ]
        }
      }
    };

    const res = await fetch('/api/line/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: targetId,
        broadcast,
        messages: [testFlex],
        token
      })
    });

    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Format a rich text for standard LINE chat sharing (LINE URL / Clipboard)
 */
export function getLineShareText(
  bill: UtilityBill,
  property: PropertyProfile,
  customNote?: string
): string {
  const isOverdue = bill.paymentStatus === 'overdue';
  const statusEmoji = isOverdue ? '⚠️ [เกินกำหนดชำระ]' : '🔔 [แจ้งเตือนกำหนดชำระเงิน]';

  return `${statusEmoji}
📋 ใบแจ้งหนี้ห้อง ${bill.roomNumber} (${property.name})
ประจำเดือน: ${bill.monthYear}
ผู้เช่า: ${bill.tenantName} ${bill.tenantPhone ? `(โทร. ${bill.tenantPhone})` : ''}
----------------------------------------
1. ค่าเช่าห้องพัก: ${formatCurrency(bill.roomRentAmount)}
2. ค่าน้ำประปา (${bill.waterUnits} หน่วย): ${formatCurrency(bill.waterAmount)}
3. ค่าไฟฟ้า (${bill.elecUnits} หน่วย): ${formatCurrency(bill.elecAmount)}
${bill.commonFee > 0 ? `4. ค่าส่วนกลาง: ${formatCurrency(bill.commonFee)}\n` : ''}${bill.internetFee > 0 ? `5. ค่าอินเทอร์เน็ต: ${formatCurrency(bill.internetFee)}\n` : ''}${bill.parkingFee > 0 ? `6. ค่าที่จอดรถ: ${formatCurrency(bill.parkingFee)}\n` : ''}${bill.trashFee > 0 ? `7. ค่าขยะ: ${formatCurrency(bill.trashFee)}\n` : ''}${bill.otherFees > 0 ? `8. ${bill.otherFeesNote || 'อื่นๆ'}: ${formatCurrency(bill.otherFees)}\n` : ''}${bill.discount > 0 ? `ส่วนลด: -${formatCurrency(bill.discount)}\n` : ''}
💰 รวมยอดที่ต้องชำระทั้งสิ้น: ${formatCurrency(bill.grandTotal)}
${bill.paidAmount && bill.paidAmount > 0 ? `💵 ชำระแล้ว: ${formatCurrency(bill.paidAmount)} (คงเหลือ: ${formatCurrency(Math.max(0, bill.grandTotal - bill.paidAmount))})\n` : ''}📅 กำหนดชำระภายใน: ${formatDateThai(bill.dueDate)}
----------------------------------------
💳 ช่องทางการชำระเงิน:
${property.promptPayId ? `📲 พร้อมเพย์: ${property.promptPayId} (${property.promptPayName || property.name})` : ''}
${property.bankAccount ? `🏦 ธนาคาร: ${property.bankName} ${property.bankAccount} (${property.bankAccountName || property.name})` : ''}
${customNote ? `\n💬 ข้อความเพิ่มเติม: ${customNote}` : ''}
เมื่อโอนเงินแล้ว กรุณาส่งสลิปแจ้งโอนในแชทนี้ได้เลยครับ/ค่ะ 🙏`;
}

/**
 * Build 1-click LINE app share URL
 */
export function getLineShareUrl(
  bill: UtilityBill,
  property: PropertyProfile,
  customNote?: string
): string {
  const text = getLineShareText(bill, property, customNote);
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}

/**
 * Check if a bill is due today, overdue, or due within specified days
 */
export function getBillDueStatus(bill: UtilityBill, daysThreshold: number = 3): {
  isDue: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  daysRemaining: number;
  label: string;
} {
  if (bill.paymentStatus === 'paid') {
    return { isDue: false, isOverdue: false, isDueSoon: false, daysRemaining: 0, label: 'ชำระแล้ว' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(bill.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      isDue: true,
      isOverdue: true,
      isDueSoon: false,
      daysRemaining: diffDays,
      label: `เกินกำหนด ${Math.abs(diffDays)} วัน`
    };
  } else if (diffDays === 0) {
    return {
      isDue: true,
      isOverdue: false,
      isDueSoon: true,
      daysRemaining: 0,
      label: 'ครบกำหนดวันนี้'
    };
  } else if (diffDays <= daysThreshold) {
    return {
      isDue: true,
      isOverdue: false,
      isDueSoon: true,
      daysRemaining: diffDays,
      label: `ครบกำหนดใน ${diffDays} วัน`
    };
  }

  return {
    isDue: false,
    isOverdue: false,
    isDueSoon: false,
    daysRemaining: diffDays,
    label: `กำหนดชำระ ${formatDateThai(bill.dueDate)}`
  };
}
