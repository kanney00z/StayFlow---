import React from 'react';

export interface ThaiBank {
  id: string;
  code: string;
  officialName: string;
  shortNameTh: string;
  shortNameEn: string;
  color: string;
  textColor: string;
  borderColor?: string;
}

export const THAI_BANKS: ThaiBank[] = [
  {
    id: 'kbank',
    code: 'KBANK',
    officialName: 'ธนาคารกสิกรไทย (KBANK)',
    shortNameTh: 'กสิกรไทย',
    shortNameEn: 'Kasikornbank',
    color: '#138f2d',
    textColor: '#ffffff',
    borderColor: '#0e6d22',
  },
  {
    id: 'scb',
    code: 'SCB',
    officialName: 'ธนาคารไทยพาณิชย์ (SCB)',
    shortNameTh: 'ไทยพาณิชย์',
    shortNameEn: 'Siam Commercial Bank',
    color: '#4e2e7f',
    textColor: '#ffffff',
    borderColor: '#391f60',
  },
  {
    id: 'bbl',
    code: 'BBL',
    officialName: 'ธนาคารกรุงเทพ (BBL)',
    shortNameTh: 'กรุงเทพ',
    shortNameEn: 'Bangkok Bank',
    color: '#1e3f8b',
    textColor: '#ffffff',
    borderColor: '#152c63',
  },
  {
    id: 'ktb',
    code: 'KTB',
    officialName: 'ธนาคารกรุงไทย (KTB)',
    shortNameTh: 'กรุงไทย',
    shortNameEn: 'Krungthai Bank',
    color: '#00a5e5',
    textColor: '#ffffff',
    borderColor: '#0083b7',
  },
  {
    id: 'bay',
    code: 'BAY',
    officialName: 'ธนาคารกรุงศรีอยุธยา (Krungsri)',
    shortNameTh: 'กรุงศรีอยุธยา',
    shortNameEn: 'Bank of Ayudhya',
    color: '#fec43b',
    textColor: '#4a3800',
    borderColor: '#d49e1f',
  },
  {
    id: 'ttb',
    code: 'TTB',
    officialName: 'ธนาคารทหารไทยธนชาต (ttb)',
    shortNameTh: 'ทหารไทยธนชาต',
    shortNameEn: 'TMBThanachart Bank',
    color: '#002d63',
    textColor: '#ffffff',
    borderColor: '#001a3d',
  },
  {
    id: 'gsb',
    code: 'GSB',
    officialName: 'ธนาคารออมสิน (GSB)',
    shortNameTh: 'ออมสิน',
    shortNameEn: 'Government Savings Bank',
    color: '#eb1985',
    textColor: '#ffffff',
    borderColor: '#bd1068',
  },
  {
    id: 'baac',
    code: 'BAAC',
    officialName: 'ธ.ก.ส. (BAAC)',
    shortNameTh: 'ธ.ก.ส.',
    shortNameEn: 'BAAC',
    color: '#1b7340',
    textColor: '#ffffff',
    borderColor: '#114a29',
  },
  {
    id: 'uob',
    code: 'UOB',
    officialName: 'ธนาคารยูโอบี (UOB)',
    shortNameTh: 'ยูโอบี',
    shortNameEn: 'United Overseas Bank',
    color: '#0b2d64',
    textColor: '#ffffff',
    borderColor: '#cf1322',
  },
  {
    id: 'cimb',
    code: 'CIMB',
    officialName: 'ธนาคารซีไอเอ็มบีไทย (CIMB Thai)',
    shortNameTh: 'ซีไอเอ็มบีไทย',
    shortNameEn: 'CIMB Thai',
    color: '#7d181e',
    textColor: '#ffffff',
    borderColor: '#5c0f14',
  },
  {
    id: 'kkp',
    code: 'KKP',
    officialName: 'ธนาคารเกียรตินาคินภัทร (KKP)',
    shortNameTh: 'เกียรตินาคินภัทร',
    shortNameEn: 'Kiatnakin Phatra Bank',
    color: '#4d4076',
    textColor: '#ffffff',
    borderColor: '#392e59',
  },
  {
    id: 'tisco',
    code: 'TISCO',
    officialName: 'ธนาคารทิสโก้ (TISCO)',
    shortNameTh: 'ทิสโก้',
    shortNameEn: 'TISCO Bank',
    color: '#1a5ea8',
    textColor: '#ffffff',
    borderColor: '#114073',
  },
  {
    id: 'lhb',
    code: 'LHBANK',
    officialName: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
    shortNameTh: 'แลนด์ แอนด์ เฮ้าส์',
    shortNameEn: 'LH Bank',
    color: '#698899',
    textColor: '#ffffff',
    borderColor: '#4d6573',
  },
  {
    id: 'promptpay',
    code: 'PROMPTPAY',
    officialName: 'พร้อมเพย์ (PromptPay)',
    shortNameTh: 'พร้อมเพย์',
    shortNameEn: 'PromptPay',
    color: '#003d6b',
    textColor: '#ffffff',
    borderColor: '#002542',
  },
  {
    id: 'other',
    code: 'OTHER',
    officialName: 'ธนาคารอื่นๆ (ระบุเอง)',
    shortNameTh: 'อื่นๆ',
    shortNameEn: 'Other Bank',
    color: '#475569',
    textColor: '#ffffff',
    borderColor: '#334155',
  },
];

/**
 * Find matching Thai bank by code, official name, short name or partial string
 */
export function getBankByCodeOrName(input?: string | null): ThaiBank | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  // Direct code match
  const byCode = THAI_BANKS.find(b => b.code.toLowerCase() === clean || b.id === clean);
  if (byCode) return byCode;

  // Direct official name match
  const byOfficial = THAI_BANKS.find(b => b.officialName.toLowerCase() === clean);
  if (byOfficial) return byOfficial;

  // Keyword check
  if (clean.includes('kbank') || clean.includes('กสิกร')) return THAI_BANKS.find(b => b.code === 'KBANK') || null;
  if (clean.includes('scb') || clean.includes('ไทยพาณิชย์')) return THAI_BANKS.find(b => b.code === 'SCB') || null;
  if (clean.includes('bbl') || clean.includes('กรุงเทพ')) return THAI_BANKS.find(b => b.code === 'BBL') || null;
  if (clean.includes('ktb') || clean.includes('กรุงไทย')) return THAI_BANKS.find(b => b.code === 'KTB') || null;
  if (clean.includes('bay') || clean.includes('krungsri') || clean.includes('กรุงศรี')) return THAI_BANKS.find(b => b.code === 'BAY') || null;
  if (clean.includes('ttb') || clean.includes('ทหารไทย') || clean.includes('ธนชาต')) return THAI_BANKS.find(b => b.code === 'TTB') || null;
  if (clean.includes('gsb') || clean.includes('ออมสิน')) return THAI_BANKS.find(b => b.code === 'GSB') || null;
  if (clean.includes('baac') || clean.includes('ธกส') || clean.includes('ธ.ก.ส')) return THAI_BANKS.find(b => b.code === 'BAAC') || null;
  if (clean.includes('uob') || clean.includes('ยูโอบี')) return THAI_BANKS.find(b => b.code === 'UOB') || null;
  if (clean.includes('cimb') || clean.includes('ซีไอเอ็มบี')) return THAI_BANKS.find(b => b.code === 'CIMB') || null;
  if (clean.includes('kkp') || clean.includes('เกียรตินาคิน')) return THAI_BANKS.find(b => b.code === 'KKP') || null;
  if (clean.includes('tisco') || clean.includes('ทิสโก้')) return THAI_BANKS.find(b => b.code === 'TISCO') || null;
  if (clean.includes('lh') || clean.includes('แลนด์ แอนด์ เฮ้าส์')) return THAI_BANKS.find(b => b.code === 'LHBANK') || null;
  if (clean.includes('promptpay') || clean.includes('พร้อมเพย์')) return THAI_BANKS.find(b => b.code === 'PROMPTPAY') || null;

  return null;
}
