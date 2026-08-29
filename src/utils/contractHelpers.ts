import { LeaseContract, Room, Tenant, PropertyProfile, UtilityBill } from '../types';
import { addMonthsToDate } from './formatters';

export const DEFAULT_CONTRACT_RULES: string[] = [
  'ผู้เช่าตกลงชำระค่าเช่าห้องพัก พร้อมค่าน้ำ ค่าไฟ และค่าบริการส่วนกลาง ภายในวันที่ 5 ของทุกเดือน',
  'เงินประกันการเช่าจะได้รับคืนเมื่อสิ้นสุดสัญญาเช่า หลังจากหักค่าเสียหาย ค่าทำความสะอาด และค้างชำระค่าน้ำค่าไฟ (ถ้ามี)',
  'ผู้เช่าจะต้องดูแลรักษาห้องพักและทรัพย์สินภายในห้องให้อยู่ในสภาพดี ห้ามดัดแปลง ต่อเติม หรือเจาะผนังโดยไม่ได้รับอนุญาต',
  'ห้ามส่งเสียงดัง หรือกระทำการใดๆ อันเป็นการรบกวนความสงบสุขของผู้พักอาศัยห้องข้างเคียง',
  'ห้ามนำสารเสพติด วัตถุไวไฟ วัตถุอันตราย หรือสิ่งผิดกฎหมายทุกชนิดเข้ามาในบริเวณหอพัก/อพาร์ตเมนต์',
  'ห้ามเลี้ยงสัตว์เลี้ยงทุกชนิดภายในห้องพักและบริเวณอาคาร (เว้นแต่จะได้รับอนุญาตเป็นลายลักษณ์อักษร)',
  'ห้ามนำห้องพักไปให้บุคคลอื่นเช่าช่วง (Sublease) โดยเด็ดขาด',
  'หากผู้เช่าประสงค์จะย้ายออกเมื่อครบกำหนดสัญญา ต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าไม่น้อยกว่า 30 วัน',
];

export function createDefaultLeaseContract(
  room: Room,
  tenant: Tenant | undefined,
  property: PropertyProfile,
  bill?: UtilityBill
): LeaseContract {
  const today = new Date().toISOString().split('T')[0];
  const startDate = tenant?.startDate || bill?.billingDate || today;
  const durationMonths = 12;
  const endDate = tenant?.endDate || addMonthsToDate(startDate, durationMonths);
  const monthlyRent = tenant?.monthlyRent || bill?.roomRentAmount || room.monthlyRate || 4500;
  const deposit = tenant?.depositAmount || room.depositMonthly || monthlyRent * 2;

  return {
    id: `CTR-${room.number}-${Date.now().toString().slice(-6)}`,
    contractNumber: `CTR-${room.number}-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    contractDate: today,
    contractPlace: property.name,
    
    // Lessor
    lessorName: property.bankAccountName || property.name,
    lessorIdCard: property.taxId || '0-1055-67890-12-3',
    lessorPhone: property.phone,
    lessorAddress: property.address,
    
    // Lessee
    lesseeName: tenant?.name || bill?.tenantName || 'ผู้เช่าห้องพัก',
    lesseeIdCard: tenant?.idCard || '1-1004-99887-65-4',
    lesseePhone: tenant?.phone || bill?.tenantPhone || '08X-XXX-XXXX',
    lesseeAddress: property.address ? `พักอาศัย ณ ห้อง ${room.number} ${property.name}` : '',
    lesseeEmergencyContact: tenant?.emergencyContact || '',
    lesseeEmergencyPhone: tenant?.emergencyPhone || '',
    
    // Room
    roomId: room.id,
    roomNumber: room.number,
    roomType: room.type,
    buildingName: room.building || property.name,
    
    // Terms
    startDate,
    endDate,
    durationMonths,
    monthlyRent,
    depositAmount: deposit,
    advanceRentAmount: monthlyRent,
    paymentDueDay: 5,
    
    // Utility rates
    waterRateText: bill ? `${bill.waterRate} บาท/หน่วย` : '18 บาท/หน่วย',
    elecRateText: bill ? `${bill.elecRate} บาท/หน่วย` : '8 บาท/หน่วย',
    commonFeeMonthly: bill?.commonFee || 300,
    otherFeesText: 'ค่าขยะและค่าบำรุงรักษาอาคาร',
    
    // Rules
    rulesAndClauses: [...DEFAULT_CONTRACT_RULES],
    specialConditions: 'ผู้เช่าได้รับกุญแจห้องพักจำนวน 1 ชุด และคีย์การ์ดเข้าออกอาคาร 1 ใบ',
    
    // Signatures
    lessorSignatureName: property.bankAccountName || property.name,
    lesseeSignatureName: tenant?.name || bill?.tenantName || 'ผู้เช่าห้องพัก',
    witnessName1: 'เจ้าหน้าที่นิติบุคคล / ผู้จัดการหอพัก',
    witnessName2: 'พยาน',
    
    createdAt: new Date().toISOString(),
    status: 'active',
  };
}
