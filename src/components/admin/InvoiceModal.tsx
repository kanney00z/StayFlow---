import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Printer, CheckCircle2, QrCode, Send, 
  Copy, Check, FileText, Calendar, Building2, User, Phone, Zap, Droplets, CreditCard,
  Upload, Image as ImageIcon, Trash2, Eye, DollarSign, Clock, AlertCircle, Sparkles,
  RefreshCw, CheckCircle, ArrowRight, Scale, ShieldCheck, Download
} from 'lucide-react';
import { UtilityBill, PropertyProfile, Room, Tenant, LeaseContract } from '../../types';
import { formatCurrency, formatDateThai } from '../../utils/formatters';
import { PromptPayQR } from '../ui/PromptPayQR';
import { SlipViewerModal } from './SlipViewerModal';
import { fileToBase64, generateSampleSlip } from '../../utils/slipHelpers';
import { LeaseContractSection } from './LeaseContractSection';
import { printHtmlContent, generateInvoiceHtml, downloadHtmlFile } from '../../utils/printHelpers';

interface InvoiceModalProps {
  bill: UtilityBill | null;
  property: PropertyProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (billId: string, status: 'paid' | 'unpaid' | 'partial') => void;
  onUpdateBillPayment?: (
    billId: string,
    paymentData: {
      paymentStatus: 'paid' | 'unpaid' | 'overdue' | 'partial';
      paidAmount?: number;
      remainingBalance?: number;
      paidDate?: string;
      paidMethod?: string;
      slipImage?: string;
      slipDate?: string;
      slipReference?: string;
      note?: string;
    }
  ) => void;
  onUpdateBillContract?: (billId: string, contract: LeaseContract) => void;
  bills?: UtilityBill[];
  rooms?: Room[];
  tenants?: Tenant[];
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  bill,
  property,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateBillPayment,
  onUpdateBillContract,
  bills = [],
  rooms = [],
  tenants = [],
}) => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'payment' | 'contract'>('invoice');
  const [showQR, setShowQR] = useState(false);
  const [copiedLine, setCopiedLine] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [includeContractInPrint, setIncludeContractInPrint] = useState<boolean>(true);
  const [isPrintingInvoice, setIsPrintingInvoice] = useState<boolean>(false);
  const [downloadInvoiceSuccess, setDownloadInvoiceSuccess] = useState<boolean>(false);

  // Payment Form States
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('โอนเงินผ่านธนาคาร');
  const [paidDateTime, setPaidDateTime] = useState<string>('');
  const [slipImage, setSlipImage] = useState<string | undefined>(undefined);
  const [slipReference, setSlipReference] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when bill changes
  useEffect(() => {
    if (bill) {
      const initialPaid = bill.paidAmount !== undefined 
        ? bill.paidAmount 
        : (bill.paymentStatus === 'paid' ? bill.grandTotal : 0);
      
      setPaidAmountInput(initialPaid);
      setPaymentMethod(bill.paidMethod || 'โอนเงินผ่านธนาคาร');
      setPaidDateTime(bill.paidDate || new Date().toISOString().replace('T', ' ').slice(0, 16));
      setSlipImage(bill.slipImage);
      setSlipReference(bill.slipReference || '');
      setPaymentNote(bill.note || '');
      setShowQR(false);
      setSaveSuccessMsg(null);
    }
  }, [bill, isOpen]);

  if (!isOpen || !bill) return null;

  // Calculate total bills for this room
  const roomBills = bills.filter(b => b.roomId === bill.roomId || b.roomNumber === bill.roomNumber);
  const roomBillsCount = roomBills.length || 1;
  const billIndex = roomBills.findIndex(b => b.id === bill.id);
  const billSeqNumber = billIndex >= 0 ? roomBills.length - billIndex : roomBillsCount;

  // Find room and tenant objects
  const currentRoom: Room = rooms.find(r => r.id === bill.roomId || r.number === bill.roomNumber) || {
    id: bill.roomId || `r-${bill.roomNumber}`,
    number: bill.roomNumber,
    floor: parseInt(bill.roomNumber[0]) || 1,
    type: 'ห้องพักมาตรฐาน',
    dailyRate: 650,
    monthlyRate: bill.roomRentAmount || 4500,
    depositDaily: 500,
    depositMonthly: (bill.roomRentAmount || 4500) * 2,
    status: 'occupied',
    building: property.name,
    images: [],
    amenities: ['เครื่องปรับอากาศ', 'เตียง', 'ตู้เสื้อผ้า'],
    waterMeter: bill.currWaterMeter,
    electricityMeter: bill.currElecMeter,
  };

  const currentTenant: Tenant | undefined = tenants.find(
    t => t.roomNumber === bill.roomNumber || t.roomId === bill.roomId
  );

  // Remaining balance calculation
  const remainingBalance = Math.max(0, bill.grandTotal - paidAmountInput);

  // Status deduction based on amount paid
  const calculatedStatus: 'paid' | 'unpaid' | 'partial' = 
    paidAmountInput >= bill.grandTotal 
      ? 'paid' 
      : paidAmountInput > 0 
        ? 'partial' 
        : 'unpaid';

  const handlePrint = () => {
    setIsPrintingInvoice(true);
    try {
      const html = generateInvoiceHtml(bill, property, billSeqNumber, roomBillsCount);
      printHtmlContent(`ใบแจ้งหนี้ห้อง_${bill.roomNumber}_${bill.billNumber}`, html);
    } catch (err) {
      console.error('Print invoice error', err);
      window.print();
    } finally {
      setTimeout(() => setIsPrintingInvoice(false), 1500);
    }
  };

  const handleDownloadInvoice = () => {
    try {
      const html = generateInvoiceHtml(bill, property, billSeqNumber, roomBillsCount);
      downloadHtmlFile(`ใบแจ้งหนี้ห้อง_${bill.roomNumber}_${bill.billNumber}.html`, html);
      setDownloadInvoiceSuccess(true);
      setTimeout(() => setDownloadInvoiceSuccess(false), 2500);
    } catch (err) {
      console.error('Download invoice error', err);
    }
  };

  const handleCopyLineText = () => {
    const text = `📋 ใบแจ้งหนี้ห้อง ${bill.roomNumber} (${property.name})
ประจำเดือน: ${bill.monthYear} (บิลลำดับที่ ${billSeqNumber} / ทั้งหมด ${roomBillsCount} บิลของห้องนี้)
ผู้เช่า: ${bill.tenantName}
------------------------------
1. ค่าเช่าห้อง: ${formatCurrency(bill.roomRentAmount)}
2. ค่าน้ำประปา: ${bill.waterUnits} หน่วย (${bill.prevWaterMeter} ➔ ${bill.currWaterMeter}) = ${formatCurrency(bill.waterAmount)}
3. ค่าไฟฟ้า: ${bill.elecUnits} หน่วย (${bill.prevElecMeter} ➔ ${bill.currElecMeter}) = ${formatCurrency(bill.elecAmount)}
${bill.commonFee > 0 ? `4. ค่าส่วนกลาง: ${formatCurrency(bill.commonFee)}\n` : ''}${bill.internetFee > 0 ? `5. ค่าอินเทอร์เน็ต: ${formatCurrency(bill.internetFee)}\n` : ''}${bill.parkingFee > 0 ? `6. ค่าที่จอดรถ: ${formatCurrency(bill.parkingFee)}\n` : ''}${bill.trashFee > 0 ? `7. ค่าขยะ: ${formatCurrency(bill.trashFee)}\n` : ''}
💰 รวมยอดที่ต้องชำระ: ${formatCurrency(bill.grandTotal)}
${bill.paidAmount && bill.paidAmount > 0 ? `💵 ชำระแล้ว: ${formatCurrency(bill.paidAmount)} (คงเหลือ: ${formatCurrency(Math.max(0, bill.grandTotal - bill.paidAmount))})\n` : ''}กำหนดชำระภายใน: ${formatDateThai(bill.dueDate)}
------------------------------
📲 โอนพร้อมเพย์: ${property.promptPayId} (${property.promptPayName})
บัญชีธนาคาร: ${property.bankName} ${property.bankAccount}
ขอบคุณครับ/ค่ะ 🙏`;

    navigator.clipboard.writeText(text);
    setCopiedLine(true);
    setTimeout(() => setCopiedLine(false), 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setSlipImage(base64);
        if (paidAmountInput === 0) {
          setPaidAmountInput(bill.grandTotal);
        }
      } catch (err) {
        console.error('Failed to read slip image', err);
      }
    }
  };

  const handleUseSampleSlip = (bank: 'kbank' | 'scb' | 'bbl' | 'promptpay') => {
    const sample = generateSampleSlip(bill.roomNumber, bill.grandTotal, bank, bill.tenantName);
    setSlipImage(sample);
    if (paidAmountInput === 0) {
      setPaidAmountInput(bill.grandTotal);
    }
    setSlipReference(`TXN-${Date.now().toString().slice(-6)}`);
    setPaymentMethod(bank === 'promptpay' ? 'พร้อมเพย์ QR' : `โอนเงินผ่าน ธ.${bank.toUpperCase()}`);
  };

  const handleSavePayment = () => {
    const newStatus = calculatedStatus;
    const paymentData = {
      paymentStatus: newStatus,
      paidAmount: paidAmountInput,
      remainingBalance,
      paidDate: paidAmountInput > 0 ? paidDateTime : undefined,
      paidMethod: paidAmountInput > 0 ? paymentMethod : undefined,
      slipImage,
      slipDate: slipImage ? paidDateTime : undefined,
      slipReference,
      note: paymentNote,
    };

    if (onUpdateBillPayment) {
      onUpdateBillPayment(bill.id, paymentData);
    } else if (onUpdateStatus) {
      onUpdateStatus(bill.id, newStatus === 'paid' ? 'paid' : 'unpaid');
    }

    setSaveSuccessMsg('บันทึกยอดเงินและสลิปสำเร็จเรียบร้อย!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveContract = (updatedContract: LeaseContract) => {
    if (onUpdateBillContract) {
      onUpdateBillContract(bill.id, updatedContract);
    } else if (onUpdateBillPayment) {
      onUpdateBillPayment(bill.id, {
        paymentStatus: bill.paymentStatus,
        ...bill,
      });
    }
  };

  return (
    <>
      <AnimatePresence>
        <div 
          id="invoice-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Top Navigation & Action Header */}
            <div className="no-print bg-slate-800/90 px-4 sm:px-6 py-3.5 border-b border-slate-700/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/60">
                  <button
                    type="button"
                    id="tab-invoice-view"
                    onClick={() => setActiveTab('invoice')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'invoice'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ใบแจ้งหนี้ / ใบเสร็จ</span>
                  </button>

                  <button
                    type="button"
                    id="tab-payment-slip"
                    onClick={() => setActiveTab('payment')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'payment'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>แนบสลิป & จดเงินชำระ</span>
                    {bill.slipImage && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>

                  <button
                    type="button"
                    id="tab-contract-view"
                    onClick={() => setActiveTab('contract')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'contract'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>สัญญาเช่าแนบบิล</span>
                    {bill.attachedContract ? (
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    ) : (
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-1 rounded border border-purple-800">สร้าง</span>
                    )}
                  </button>
                </div>

                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${
                  bill.paymentStatus === 'paid' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : bill.paymentStatus === 'partial'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {bill.paymentStatus === 'paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {bill.paymentStatus === 'partial' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                  {bill.paymentStatus === 'unpaid' && <Clock className="w-3.5 h-3.5 text-rose-400" />}
                  <span>
                    {bill.paymentStatus === 'paid' 
                      ? '✓ ชำระครบแล้ว' 
                      : bill.paymentStatus === 'partial' 
                        ? `ชำระบางส่วน (${formatCurrency(bill.paidAmount || 0)})` 
                        : 'รอชำระเงิน'}
                  </span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {activeTab === 'invoice' && (
                  <>
                    <button
                      type="button"
                      id="btn-show-qr"
                      onClick={() => setShowQR(!showQR)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        showQR 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-slate-700/80 text-slate-200 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{showQR ? 'ซ่อน PromptPay QR' : 'สแกนจ่าย PromptPay'}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-copy-line"
                      onClick={handleCopyLineText}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      {copiedLine ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{copiedLine ? 'คัดลอกแล้ว!' : 'ส่ง LINE'}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-download-invoice"
                      onClick={handleDownloadInvoice}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      title="ดาวน์โหลดไฟล์ใบแจ้งหนี้ (.HTML)"
                    >
                      {downloadInvoiceSuccess ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                      <span>{downloadInvoiceSuccess ? 'ดาวน์โหลดแล้ว' : 'บันทึกบิล'}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-print-invoice"
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isPrintingInvoice ? 'กำลังสั่งพิมพ์...' : 'พิมพ์ A4'}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* TAB 1: INVOICE / RECEIPT VIEW */}
              {activeTab === 'invoice' && (
                <div className="space-y-6">
                  {/* Attached Contract Banner Alert inside Invoice Tab */}
                  {bill.attachedContract && (
                    <div className="no-print bg-purple-950/60 border border-purple-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-purple-200 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-800/60 flex items-center justify-center text-purple-300">
                          <Scale className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>บิลนี้มีหนังสือสัญญาเช่าห้องพักแนบอยู่</span>
                            <span className="font-mono text-[11px] text-purple-300 bg-purple-900 px-1.5 py-0.2 rounded">
                              {bill.attachedContract.contractNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-300">
                            ระยะเวลาเช่า {bill.attachedContract.durationMonths} เดือน • เงินประกัน {formatCurrency(bill.attachedContract.depositAmount)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('contract')}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                      >
                        ดู/แก้ไขสัญญาเช่า
                      </button>
                    </div>
                  )}

                  {/* Printable Invoice Paper (A4 Style) */}
                  <div className="bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print-container">
                    {/* Invoice Top Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-800 pb-6 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {property.name}
                          </h2>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                            {property.nameEn}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">{property.address}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          โทร: <span className="font-mono font-bold text-slate-800">{property.phone}</span> | เลขประจำตัวผู้เสียภาษี: <span className="font-mono">{property.taxId || '-'}</span>
                        </p>
                      </div>

                      <div className="text-left sm:text-right space-y-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          bill.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {bill.paymentStatus === 'paid' ? 'ใบเสร็จรับเงิน (RECEIPT)' : 'ใบแจ้งหนี้ (INVOICE)'}
                        </span>
                        <div className="text-xs text-slate-500 pt-1">
                          เลขที่บิล: <strong className="font-mono text-slate-900 text-sm">{bill.billNumber}</strong>
                        </div>
                        <div className="text-xs text-slate-500">
                          ประจำเดือน: <strong className="text-slate-900">{bill.monthYear}</strong>
                        </div>
                        <div className="text-xs text-slate-500">
                          วันที่ออกบิล: <span className="font-mono">{formatDateThai(bill.billingDate)}</span>
                        </div>
                        <div className="text-xs text-rose-600 font-bold">
                          กำหนดชำระ: <span className="font-mono">{formatDateThai(bill.dueDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Room & Tenant Info Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl my-6 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">ข้อมูลผู้เช่าพัก</span>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{bill.tenantName}</p>
                        <p className="text-slate-600 mt-0.5 font-mono">
                          เบอร์โทรศัพท์: {bill.tenantPhone || '-'}
                        </p>
                        {bill.attachedContract && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-700 font-medium">
                            <Scale className="w-3 h-3" />
                            <span>แนบสัญญาเช่าเลขที่ {bill.attachedContract.contractNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <span className="text-slate-400 block uppercase tracking-wider font-semibold text-[10px]">ข้อมูลห้องพัก</span>
                        <div className="flex sm:justify-end items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">หมายเลขห้อง:</span>
                          <span className="text-lg font-black text-indigo-950 font-mono bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                            {bill.roomNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          ประวัติบิลห้องนี้: ลำดับที่ {billSeqNumber} จาก {roomBillsCount} รายการ
                        </p>
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-700 border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-800 text-slate-900 text-left bg-slate-50">
                            <th className="py-2.5 px-3 font-bold">ลำดับ</th>
                            <th className="py-2.5 px-3 font-bold">รายการ</th>
                            <th className="py-2.5 px-2 font-bold text-center">มิเตอร์เดิม</th>
                            <th className="py-2.5 px-2 font-bold text-center">มิเตอร์ล่าสุด</th>
                            <th className="py-2.5 px-2 font-bold text-center">จำนวนหน่วย</th>
                            <th className="py-2.5 px-2 font-bold text-right">ราคา/หน่วย</th>
                            <th className="py-2.5 px-3 font-bold text-right">จำนวนเงิน (บาท)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {/* Room Rent */}
                          <tr>
                            <td className="py-2.5 px-3 font-mono text-slate-400">1</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">ค่าเช่าห้องพักประจำเดือน ({bill.monthYear})</td>
                            <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                            <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                            <td className="py-2.5 px-2 text-center">1 เดือน</td>
                            <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(bill.roomRentAmount)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(bill.roomRentAmount)}</td>
                          </tr>

                          {/* Water */}
                          <tr>
                            <td className="py-2.5 px-3 font-mono text-slate-400">2</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">ค่าน้ำประปา</td>
                            <td className="py-2.5 px-2 text-center font-mono">{bill.prevWaterMeter}</td>
                            <td className="py-2.5 px-2 text-center font-mono">{bill.currWaterMeter}</td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-sky-600">{bill.waterUnits} หน่วย</td>
                            <td className="py-2.5 px-2 text-right font-mono">{bill.waterRate}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(bill.waterAmount)}</td>
                          </tr>

                          {/* Electricity */}
                          <tr>
                            <td className="py-2.5 px-3 font-mono text-slate-400">3</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">ค่าไฟฟ้า</td>
                            <td className="py-2.5 px-2 text-center font-mono">{bill.prevElecMeter}</td>
                            <td className="py-2.5 px-2 text-center font-mono">{bill.currElecMeter}</td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-600">{bill.elecUnits} หน่วย</td>
                            <td className="py-2.5 px-2 text-right font-mono">{bill.elecRate}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(bill.elecAmount)}</td>
                          </tr>

                          {/* Additional fees */}
                          {bill.commonFee > 0 && (
                            <tr>
                              <td className="py-2.5 px-3 font-mono text-slate-400">4</td>
                              <td className="py-2.5 px-3 text-slate-800">ค่าบริการส่วนกลางและบำรุงรักษา</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center">1</td>
                              <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(bill.commonFee)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(bill.commonFee)}</td>
                            </tr>
                          )}

                          {bill.internetFee > 0 && (
                            <tr>
                              <td className="py-2.5 px-3 font-mono text-slate-400">5</td>
                              <td className="py-2.5 px-3 text-slate-800">ค่าบริการอินเทอร์เน็ต WiFi</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center">1</td>
                              <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(bill.internetFee)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(bill.internetFee)}</td>
                            </tr>
                          )}

                          {bill.parkingFee > 0 && (
                            <tr>
                              <td className="py-2.5 px-3 font-mono text-slate-400">6</td>
                              <td className="py-2.5 px-3 text-slate-800">ค่าที่จอดรถยนต์ / มอเตอร์ไซค์</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center">1</td>
                              <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(bill.parkingFee)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(bill.parkingFee)}</td>
                            </tr>
                          )}

                          {bill.trashFee > 0 && (
                            <tr>
                              <td className="py-2.5 px-3 font-mono text-slate-400">7</td>
                              <td className="py-2.5 px-3 text-slate-800">ค่าเก็บขยะ</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center">1</td>
                              <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(bill.trashFee)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(bill.trashFee)}</td>
                            </tr>
                          )}

                          {bill.otherFees > 0 && (
                            <tr>
                              <td className="py-2.5 px-3 font-mono text-slate-400">8</td>
                              <td className="py-2.5 px-3 text-slate-800">{bill.otherFeesNote || 'ค่าใช้จ่ายอื่นๆ'}</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                              <td className="py-2.5 px-2 text-center">1</td>
                              <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(bill.otherFees)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(bill.otherFees)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Calculation & Payment Stamp Summary */}
                    <div className="mt-6 border-t-2 border-slate-800 pt-4 flex flex-col sm:flex-row justify-between items-start gap-6">
                      <div className="text-xs text-slate-500 space-y-1.5 max-w-sm">
                        <p className="font-bold text-slate-700">ช่องทางการชำระเงิน:</p>
                        <p>• ธนาคาร: <span className="font-semibold text-slate-800">{property.bankName}</span></p>
                        <p>• เลขที่บัญชี: <span className="font-mono font-bold text-slate-900">{property.bankAccount}</span> ({property.bankAccountName})</p>
                        <p>• พร้อมเพย์: <span className="font-mono font-bold text-slate-900">{property.promptPayId}</span> ({property.promptPayName})</p>
                        
                        {bill.paidAmount !== undefined && bill.paidAmount > 0 && (
                          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-0.5">
                            <div className="font-bold flex items-center gap-1 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>บันทึกการชำระเงินเรียบร้อย</span>
                            </div>
                            <div>รับชำระแล้ว: <strong className="font-mono">{formatCurrency(bill.paidAmount)}</strong> ({bill.paidMethod || 'โอนเงิน'})</div>
                            {bill.slipImage && <div className="text-[11px] text-emerald-700">📸 มีหลักฐานสลิปการโอนแนบในระบบ</div>}
                          </div>
                        )}
                      </div>

                      <div className="w-full sm:w-80 bg-slate-100 p-4 rounded-xl space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600">
                          <span>รวมเป็นเงิน:</span>
                          <span className="font-mono font-semibold">{formatCurrency(bill.subtotal)}</span>
                        </div>
                        {bill.discount > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>ส่วนลด:</span>
                            <span className="font-mono font-semibold">-{formatCurrency(bill.discount)}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-300 pt-2 flex justify-between items-baseline">
                          <span className="font-extrabold text-slate-900 text-base">ยอดชำระสุทธิ:</span>
                          <span className="text-xl font-extrabold text-indigo-950 font-mono">
                            {formatCurrency(bill.grandTotal)}
                          </span>
                        </div>

                        {/* Paid Amount and Balance Row */}
                        {bill.paidAmount !== undefined && bill.paidAmount > 0 && (
                          <div className="pt-2 border-t border-slate-200 space-y-1">
                            <div className="flex justify-between text-xs text-emerald-700 font-bold">
                              <span>ชำระแล้ว:</span>
                              <span className="font-mono">{formatCurrency(bill.paidAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>คงเหลือค้างชำระ:</span>
                              <span className={`font-mono font-bold ${
                                (bill.grandTotal - bill.paidAmount) <= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {formatCurrency(Math.max(0, bill.grandTotal - bill.paidAmount))}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-10 pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                      <div className="space-y-8">
                        <p>ผู้รับเงิน / เจ้าหน้าที่ดูแลหอพัก</p>
                        <div className="border-b border-slate-300 w-40 mx-auto"></div>
                        <p>( {property.bankAccountName || property.name} )</p>
                      </div>
                      <div className="space-y-8">
                        <p>ผู้เช่าพัก / ผู้ชำระเงิน</p>
                        <div className="border-b border-slate-300 w-40 mx-auto"></div>
                        <p>( {bill.tenantName} )</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAYMENT & SLIP RECORDING */}
              {activeTab === 'payment' && (
                <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 sm:p-7 space-y-6 text-white text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>บันทึกการรับชำระเงิน & อัปโหลดหลักฐานสลิป (Payment & Slip)</span>
                    </h4>
                    <span className="text-slate-400 font-mono">ห้อง {bill.roomNumber} • ยอดบิล {formatCurrency(bill.grandTotal)}</span>
                  </div>

                  {saveSuccessMsg && (
                    <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-3 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Payment Form */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold">ยอดเงินที่รับชำระ (บาท) *</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={paidAmountInput}
                            onChange={(e) => setPaidAmountInput(Number(e.target.value) || 0)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono text-base font-bold outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setPaidAmountInput(bill.grandTotal)}
                            className="px-3 py-3 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                          >
                            จ่ายเต็มจำนวน
                          </button>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                          <span>ยอดบิลรวม: {formatCurrency(bill.grandTotal)}</span>
                          <span className={remainingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            คงเหลือ: {formatCurrency(remainingBalance)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold">ช่องทางการชำระเงิน</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="โอนเงินผ่านธนาคาร">โอนเงินผ่านธนาคาร (Bank Transfer)</option>
                          <option value="พร้อมเพย์ QR">พร้อมเพย์ QR (PromptPay QR)</option>
                          <option value="เงินสด (Cash)">เงินสด (Cash)</option>
                          <option value="บัตรเครดิต/เดบิต">บัตรเครดิต / เดบิต</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-300 block mb-1 font-semibold">วันเวลาที่โอนเงิน</label>
                          <input
                            type="datetime-local"
                            value={paidDateTime}
                            onChange={(e) => setPaidDateTime(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-slate-300 block mb-1 font-semibold">เลขอ้างอิงสลิป / TXN</label>
                          <input
                            type="text"
                            placeholder="เช่น 2026082912345"
                            value={slipReference}
                            onChange={(e) => setSlipReference(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 block mb-1 font-semibold">บันทึกเพิ่มเติม (Note)</label>
                        <textarea
                          rows={2}
                          placeholder="หมายเหตุการชำระเงิน เช่น โอนตอนเช้า, มีส่วนลด 200..."
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    </div>

                    {/* Right: Slip Attachment & Viewer */}
                    <div className="space-y-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-indigo-400" />
                            <span>หลักฐานสลิปการโอนเงิน (Slip Image)</span>
                          </label>
                          {slipImage && (
                            <button
                              type="button"
                              onClick={() => setSlipImage(undefined)}
                              className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>ลบสลิป</span>
                            </button>
                          )}
                        </div>

                        {slipImage ? (
                          <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col items-center justify-center p-2">
                            <img
                              src={slipImage}
                              alt="Payment Slip"
                              className="max-h-56 object-contain rounded-lg shadow-sm"
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setIsViewerOpen(true)}
                                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูสลิปขนาดเต็ม</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80"
                          >
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="font-semibold text-slate-300">คลิกเพื่ออัปโหลดรูปภาพสลิป</span>
                            <span className="text-[11px] text-slate-500 mt-0.5">รองรับไฟล์ JPG, PNG</span>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>

                      {/* Demo Quick Slips */}
                      <div className="pt-2 border-t border-slate-700/80">
                        <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                          หรือเลือกตัวอย่างสลิปจำลองสำหรับทดสอบ:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUseSampleSlip('kbank')}
                            className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            กสิกร (KBank)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUseSampleSlip('scb')}
                            className="py-1.5 px-2 bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            ไทยพาณิชย์ (SCB)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUseSampleSlip('bbl')}
                            className="py-1.5 px-2 bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            กรุงเทพ (BBL)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUseSampleSlip('promptpay')}
                            className="py-1.5 px-2 bg-sky-950/60 hover:bg-sky-900 border border-sky-800 text-sky-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            พร้อมเพย์ (PP)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Payment Button */}
                  <div className="pt-3 border-t border-slate-700 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSavePayment}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/40 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>บันทึกข้อมูลการรับชำระเงิน</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: LEASE CONTRACT VIEW & EDITOR */}
              {activeTab === 'contract' && (
                <LeaseContractSection
                  contract={bill.attachedContract}
                  bill={bill}
                  room={currentRoom}
                  tenant={currentTenant}
                  property={property}
                  onSaveContract={handleSaveContract}
                />
              )}

              {/* PromptPay QR Preview Modal/Overlay */}
              {showQR && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="no-print p-6 bg-slate-800/95 border border-slate-700 rounded-3xl flex flex-col items-center shadow-2xl"
                >
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>สแกนชำระผ่าน PromptPay QR ยอด {formatCurrency(bill.grandTotal)}</span>
                  </h3>
                  <PromptPayQR
                    amount={bill.grandTotal}
                    promptPayId={property.promptPayId}
                    accountName={property.promptPayName || property.bankAccountName || property.name}
                    billNumber={bill.billNumber}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Slip Full View Modal */}
      {slipImage && (
        <SlipViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          slipUrl={slipImage}
          billNumber={bill.billNumber}
          roomNumber={bill.roomNumber}
          tenantName={bill.tenantName}
          paidAmount={bill.paidAmount ?? (bill.paymentStatus === 'paid' ? bill.grandTotal : paidAmountInput)}
          paidDate={bill.paidDate || paidDateTime}
          paidMethod={bill.paidMethod || paymentMethod}
          slipReference={bill.slipReference || slipReference}
        />
      )}
    </>
  );
};
