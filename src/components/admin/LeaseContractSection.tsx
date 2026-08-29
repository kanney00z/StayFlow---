import React, { useState } from 'react';
import { 
  FileText, Edit3, Check, Plus, Trash2, Printer, 
  Copy, Save, Building, User, Calendar, ShieldCheck, 
  AlertCircle, Sparkles, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, Scale, Download, CheckCircle, Send
} from 'lucide-react';
import { LeaseContract, PropertyProfile, UtilityBill, Room, Tenant } from '../../types';
import { formatCurrency, formatDateThai, addMonthsToDate } from '../../utils/formatters';
import { DEFAULT_CONTRACT_RULES, createDefaultLeaseContract } from '../../utils/contractHelpers';
import { printHtmlContent, generateContractHtml, downloadHtmlFile } from '../../utils/printHelpers';

interface LeaseContractSectionProps {
  contract?: LeaseContract;
  bill?: UtilityBill;
  room: Room;
  tenant?: Tenant;
  property: PropertyProfile;
  onSaveContract: (updatedContract: LeaseContract) => void;
}

export const LeaseContractSection: React.FC<LeaseContractSectionProps> = ({
  contract: initialContract,
  bill,
  room,
  tenant,
  property,
  onSaveContract,
}) => {
  // Initialize contract state
  const [contract, setContract] = useState<LeaseContract>(() => {
    return initialContract || createDefaultLeaseContract(room, tenant, property, bill);
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copiedLine, setCopiedLine] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [newRuleInput, setNewRuleInput] = useState<string>('');

  const handleSave = () => {
    const updated: LeaseContract = {
      ...contract,
      updatedAt: new Date().toISOString(),
    };
    setContract(updated);
    onSaveContract(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อความและเงื่อนไขสัญญาเช่าเป็นค่าเริ่มต้นมาตรฐานใช่หรือไม่?')) {
      const def = createDefaultLeaseContract(room, tenant, property, bill);
      setContract(def);
    }
  };

  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setContract(prev => ({
      ...prev,
      rulesAndClauses: [...prev.rulesAndClauses, newRuleInput.trim()],
    }));
    setNewRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setContract(prev => ({
      ...prev,
      rulesAndClauses: prev.rulesAndClauses.filter((_, i) => i !== index),
    }));
  };

  const handleRuleChange = (index: number, val: string) => {
    setContract(prev => {
      const updated = [...prev.rulesAndClauses];
      updated[index] = val;
      return { ...prev, rulesAndClauses: updated };
    });
  };

  const getLineContractText = () => {
    return `📜 หนังสือสัญญาเช่าห้องพัก ${contract.roomNumber} (${property.name})
เลขที่สัญญา: ${contract.contractNumber}
ผู้ให้เช่า: ${contract.lessorName}
ผู้เช่า: ${contract.lesseeName} (โทร. ${contract.lesseePhone})
---------------------------------
🗓️ ระยะเวลาเช่า: ${formatDateThai(contract.startDate)} ถึง ${contract.endDate ? formatDateThai(contract.endDate) : 'ครบกำหนด'} (${contract.durationMonths} เดือน)
💵 อัตราค่าเช่า: ${formatCurrency(contract.monthlyRent)} / เดือน (ชำระภายในวันที่ ${contract.paymentDueDay} ของทุกเดือน)
🛡️ เงินประกันความเสียหาย: ${formatCurrency(contract.depositAmount)}
⚡ ค่าน้ำ-ค่าไฟ: น้ำ ${contract.waterRateText || '-'} | ไฟ ${contract.elecRateText || '-'}
---------------------------------
📌 ข้อตกลงสำคัญ: มีระเบียบการพักอาศัย ${contract.rulesAndClauses.length} ข้อ
ขอบคุณครับ/ค่ะ 🙏`;
  };

  const handleCopyLineSummary = () => {
    const text = getLineContractText();
    navigator.clipboard.writeText(text);
    setCopiedLine(true);
    setTimeout(() => setCopiedLine(false), 2500);
  };

  const handleOpenDirectLineContractShare = () => {
    const text = getLineContractText();
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrintContract = () => {
    setIsPrinting(true);
    try {
      const html = generateContractHtml(contract, property, room);
      printHtmlContent(`สัญญาเช่าห้อง_${contract.roomNumber}`, html);
    } catch (err) {
      console.error('Failed to print contract', err);
      window.print();
    } finally {
      setTimeout(() => setIsPrinting(false), 1500);
    }
  };

  const handleDownloadContract = () => {
    try {
      const html = generateContractHtml(contract, property, room);
      downloadHtmlFile(`หนังสือสัญญาเช่าห้อง_${contract.roomNumber}_${contract.contractNumber}.html`, html);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to download contract', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="no-print bg-slate-800/90 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">สัญญาเช่าห้องพักแนบบิล</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                เลขที่ {contract.contractNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ห้อง {contract.roomNumber} • ผู้เช่า: <strong className="text-slate-200">{contract.lesseeName}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                id="btn-save-contract"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกสัญญาเช่าแนบบิล</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                id="btn-edit-contract"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>เขียน / แก้ไขสัญญาเช่า</span>
              </button>
              
              <div className="flex items-center rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-0.5">
                <button
                  type="button"
                  id="btn-direct-contract-line"
                  onClick={handleOpenDirectLineContractShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="เปิดแอป LINE เพื่อเลือกแชทส่งสัญญาให้ลูกค้าโดยตรง"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>เปิด LINE</span>
                </button>
                <button
                  type="button"
                  id="btn-copy-contract-line"
                  onClick={handleCopyLineSummary}
                  className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  title="คัดลอกข้อความสรุปสัญญาไปวางในแชท"
                >
                  {copiedLine ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLine ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                </button>
              </div>

              <button
                type="button"
                id="btn-download-contract-doc"
                onClick={handleDownloadContract}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="ดาวน์โหลดไฟล์เอกสารสัญญา (.HTML)"
              >
                {downloadSuccess ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloadSuccess ? 'ดาวน์โหลดแล้ว' : 'บันทึกไฟล์'}</span>
              </button>

              <button
                type="button"
                id="btn-print-contract"
                onClick={handlePrintContract}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPrinting ? 'กำลังสั่งพิมพ์...' : 'พิมพ์สัญญา A4'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-3 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>บันทึกสัญญาเช่าแนบเข้าบิลของห้อง {contract.roomNumber} เรียบร้อยแล้ว!</span>
        </div>
      )}


      {/* EDIT MODE: Form to customize and write clauses */}
      {isEditing ? (
        <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 sm:p-7 space-y-6 text-white text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              <span>แบบฟอร์มเขียนและปรับแต่งสัญญาเช่า (Lease Agreement Editor)</span>
            </h4>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>รีเซ็ตเป็นสัญญามาตรฐาน</span>
            </button>
          </div>

          {/* Grid 1: Basic Contract Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">เลขที่สัญญา</label>
              <input
                type="text"
                value={contract.contractNumber}
                onChange={(e) => setContract({ ...contract, contractNumber: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">วันที่ทำสัญญา</label>
              <input
                type="date"
                value={contract.contractDate}
                onChange={(e) => setContract({ ...contract, contractDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">สถานที่ทำสัญญา</label>
              <input
                type="text"
                value={contract.contractPlace || ''}
                onChange={(e) => setContract({ ...contract, contractPlace: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                placeholder="เช่น ณ สำนักงานหอพัก"
              />
            </div>
          </div>

          {/* Grid 2: Parties Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/80">
            {/* Lessor */}
            <div className="space-y-3">
              <h5 className="font-bold text-indigo-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>1. ข้อมูลผู้ให้เช่า (Lessor)</span>
              </h5>
              <div>
                <label className="text-slate-400 block mb-1">ชื่อผู้ให้เช่า / ตัวแทน</label>
                <input
                  type="text"
                  value={contract.lessorName}
                  onChange={(e) => setContract({ ...contract, lessorName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">เลขประจำตัวผู้เสียภาษี / บัตรประชาชน</label>
                <input
                  type="text"
                  value={contract.lessorIdCard || ''}
                  onChange={(e) => setContract({ ...contract, lessorIdCard: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={contract.lessorPhone}
                  onChange={(e) => setContract({ ...contract, lessorPhone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">ที่อยู่ผู้ให้เช่า</label>
                <input
                  type="text"
                  value={contract.lessorAddress}
                  onChange={(e) => setContract({ ...contract, lessorAddress: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            {/* Lessee */}
            <div className="space-y-3">
              <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>2. ข้อมูลผู้เช่า (Lessee)</span>
              </h5>
              <div>
                <label className="text-slate-400 block mb-1">ชื่อ-นามสกุล ผู้เช่า</label>
                <input
                  type="text"
                  value={contract.lesseeName}
                  onChange={(e) => setContract({ ...contract, lesseeName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">เลขประจำตัวประชาชนผู้เช่า</label>
                <input
                  type="text"
                  value={contract.lesseeIdCard}
                  onChange={(e) => setContract({ ...contract, lesseeIdCard: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">เบอร์โทรศัพท์ผู้เช่า</label>
                <input
                  type="text"
                  value={contract.lesseePhone}
                  onChange={(e) => setContract({ ...contract, lesseePhone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">ผู้ติดต่อฉุกเฉิน & เบอร์โทร</label>
                <input
                  type="text"
                  value={contract.lesseeEmergencyContact ? `${contract.lesseeEmergencyContact} (${contract.lesseeEmergencyPhone || ''})` : ''}
                  onChange={(e) => setContract({ ...contract, lesseeEmergencyContact: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  placeholder="เช่น มารดา 089-XXX-XXXX"
                />
              </div>
            </div>
          </div>

          {/* Grid 3: Rental Financials & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/80">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ค่าเช่ารายเดือน (บาท)</label>
              <input
                type="number"
                value={contract.monthlyRent}
                onChange={(e) => setContract({ ...contract, monthlyRent: Number(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">เงินประกันห้อง (บาท)</label>
              <input
                type="number"
                value={contract.depositAmount}
                onChange={(e) => setContract({ ...contract, depositAmount: Number(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ระยะเวลาสัญญา (เดือน)</label>
              <input
                type="number"
                value={contract.durationMonths}
                onChange={(e) => {
                  const months = Number(e.target.value) || 1;
                  setContract({ 
                    ...contract, 
                    durationMonths: months,
                    endDate: addMonthsToDate(contract.startDate, months)
                  });
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">กำหนดชำระทุกวันที่</label>
              <input
                type="number"
                min="1"
                max="31"
                value={contract.paymentDueDay}
                onChange={(e) => setContract({ ...contract, paymentDueDay: Number(e.target.value) || 5 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Grid 4: Utility Rates text */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ข้อความค่าน้ำประปา</label>
              <input
                type="text"
                value={contract.waterRateText || ''}
                onChange={(e) => setContract({ ...contract, waterRateText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                placeholder="เช่น 18 บาท/หน่วย หรือ เหมาจ่าย 150 บาท"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ข้อความค่าไฟฟ้า</label>
              <input
                type="text"
                value={contract.elecRateText || ''}
                onChange={(e) => setContract({ ...contract, elecRateText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                placeholder="เช่น 8 บาท/หน่วย"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ค่าบริการส่วนกลาง (บาท/เดือน)</label>
              <input
                type="number"
                value={contract.commonFeeMonthly || 0}
                onChange={(e) => setContract({ ...contract, commonFeeMonthly: Number(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Contract Clauses & Rules Editor */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/80">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-indigo-300">
                3. ข้อกำหนดและระเบียบการพักอาศัย ({contract.rulesAndClauses.length} ข้อ)
              </h5>
              <span className="text-[11px] text-slate-400">แก้ไข ลบ หรือเพิ่มข้อความได้ตามต้องการ</span>
            </div>

            <div className="space-y-2">
              {contract.rulesAndClauses.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                  <span className="w-6 h-6 rounded-lg bg-slate-700 font-mono font-bold text-slate-300 flex items-center justify-center shrink-0 text-xs mt-0.5">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => handleRuleChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-none text-white text-xs outline-none focus:bg-slate-900/80 px-2 py-1 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                    title="ลบข้อนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Rule */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                placeholder="พิมพ์ข้อกำหนดสัญญาเพิ่มเติมที่ต้องการ แล้วกดเพิ่ม..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddRule}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มข้อสัญญา</span>
              </button>
            </div>
          </div>

          {/* Special Conditions */}
          <div>
            <label className="text-slate-400 block mb-1 font-semibold">เงื่อนไขเพิ่มเติมพิเศษ / ทรัพย์สินที่ส่งมอบ</label>
            <textarea
              rows={2}
              value={contract.specialConditions || ''}
              onChange={(e) => setContract({ ...contract, specialConditions: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 resize-none"
              placeholder="เช่น ผู้เช่าได้รับกุญแจห้องพัก 1 ชุด, คีย์การ์ด 1 ใบ, รีโมทแอร์ 1 อัน..."
            />
          </div>

          {/* Signatures Names */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ชื่อผู้ให้เช่า (ลงนาม)</label>
              <input
                type="text"
                value={contract.lessorSignatureName || contract.lessorName}
                onChange={(e) => setContract({ ...contract, lessorSignatureName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ชื่อผู้เช่า (ลงนาม)</label>
              <input
                type="text"
                value={contract.lesseeSignatureName || contract.lesseeName}
                onChange={(e) => setContract({ ...contract, lesseeSignatureName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">ชื่อพยาน</label>
              <input
                type="text"
                value={contract.witnessName1 || 'พยาน'}
                onChange={(e) => setContract({ ...contract, witnessName1: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="pt-3 border-t border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกสัญญาเช่าแนบบิล</span>
            </button>
          </div>
        </div>
      ) : (
        /* OFFICIAL THAI LEASE CONTRACT DOCUMENT (A4 printable styling) */
        <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 print-container font-serif">
          {/* Header */}
          <div className="text-center space-y-2 border-b-2 border-slate-800 pb-6 mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-slate-900">
              หนังสือสัญญาเช่าห้องพัก / อาคารชุด
            </h2>
            <p className="text-sm font-semibold text-slate-600 font-sans">{property.name} ({property.nameEn})</p>
            <div className="flex justify-between items-center text-xs text-slate-600 pt-2 font-sans">
              <span className="font-mono">เลขที่สัญญา: <strong className="text-slate-900">{contract.contractNumber}</strong></span>
              <span>ทำ ณ <strong className="text-slate-900">{contract.contractPlace || property.name}</strong></span>
              <span>วันที่ <strong className="text-slate-900">{formatDateThai(contract.contractDate)}</strong></span>
            </div>
          </div>

          {/* Contract Content */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
            <p className="indent-8 text-justify">
              สัญญาเช่าฉบับนี้ทำขึ้นระหว่าง <strong>{contract.lessorName}</strong> เลขประจำตัว/ทะเบียนเลขที่ <strong>{contract.lessorIdCard || '-'}</strong> ตั้งอยู่เลขที่ {contract.lessorAddress} โทรศัพท์ {contract.lessorPhone} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>"ผู้ให้เช่า"</strong> ฝ่ายหนึ่ง กับ
            </p>

            <p className="indent-8 text-justify">
              <strong>{contract.lesseeName}</strong> ถือบัตรประจำตัวประชาชนเลขที่ <strong>{contract.lesseeIdCard || '-'}</strong> โทรศัพท์ <strong>{contract.lesseePhone}</strong> {contract.lesseeEmergencyContact ? `(ผู้ติดต่อฉุกเฉิน: ${contract.lesseeEmergencyContact})` : ''} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>"ผู้เช่า"</strong> อีกฝ่ายหนึ่ง
            </p>

            <p className="font-bold pt-2 text-slate-900">
              คู่สัญญาทั้งสองฝ่ายได้ตกลงทำสัญญากันโดยมีข้อความและเงื่อนไขดังต่อไปนี้:
            </p>

            {/* Structured Terms */}
            <div className="space-y-2.5 pl-2">
              <p>
                <strong>ข้อ 1. ทรัพย์สินที่เช่า:</strong> ผู้ให้เช่าตกลงให้เช่า และผู้เช่าตกลงเช่าห้องพัก <strong>ห้องเลขที่ {contract.roomNumber}</strong> ชั้นที่ {room.floor} ประเภท {room.type} ภายในอาคาร {contract.buildingName || property.name} เพื่อใช้เป็นที่อยู่อาศัยเท่านั้น
              </p>

              <p>
                <strong>ข้อ 2. ระยะเวลาการเช่า:</strong> สัญญานี้มีกำหนดระยะเวลา <strong>{contract.durationMonths} เดือน</strong> เริ่มต้นตั้งแต่วันที่ <strong>{formatDateThai(contract.startDate)}</strong> ถึงวันที่ <strong>{contract.endDate ? formatDateThai(contract.endDate) : 'ครบกำหนดสัญญา'}</strong>
              </p>

              <p>
                <strong>ข้อ 3. อัตราค่าเช่าและการชำระเงิน:</strong> ผู้เช่าตกลงชำระค่าเช่าในอัตราเดือนละ <strong>{formatCurrency(contract.monthlyRent)}</strong> ({contract.monthlyRent.toLocaleString('th-TH')} บาทถ้วน) โดยต้องชำระล่วงหน้าภายในวันที่ <strong>{contract.paymentDueDay}</strong> ของทุกเดือน
              </p>

              <p>
                <strong>ข้อ 4. เงินประกันความเสียหายและค่าเช่าล่วงหน้า:</strong> ในวันทำสัญญานี้ ผู้เช่าได้วางเงินประกันความเสียหายเป็นจำนวนเงิน <strong>{formatCurrency(contract.depositAmount)}</strong> และค่าเช่าล่วงหน้า 1 เดือน เป็นเงิน <strong>{formatCurrency(contract.advanceRentAmount || contract.monthlyRent)}</strong> ให้แก่ผู้ให้เช่าเรียบร้อยแล้ว โดยผู้ให้เช่าจะคืนเงินประกันให้แก่ผู้เช่าเมื่อสิ้นสุดสัญญาและตรวจรับห้องพักเรียบร้อยแล้ว
              </p>

              <p>
                <strong>ข้อ 5. ค่าน้ำประปา ค่าไฟฟ้า และค่าบริการส่วนกลาง:</strong> ผู้เช่าตกลงชำระตามอัตราที่กำหนด ได้แก่ ค่าน้ำประปา {contract.waterRateText || '18 บาท/หน่วย'}, ค่าไฟฟ้า {contract.elecRateText || '8 บาท/หน่วย'} {contract.commonFeeMonthly ? `, ค่าส่วนกลาง ${formatCurrency(contract.commonFeeMonthly)}/เดือน` : ''}
              </p>

              {/* Rules and Clauses */}
              <div className="space-y-1 pt-1">
                <p className="font-bold text-slate-900"><strong>ข้อ 6. ข้อกำหนดและระเบียบการพักอาศัย:</strong></p>
                <ol className="list-decimal pl-6 space-y-1.5 text-slate-700 text-xs sm:text-[13px]">
                  {contract.rulesAndClauses.map((rule, idx) => (
                    <li key={idx} className="pl-1 text-justify">
                      {rule}
                    </li>
                  ))}
                </ol>
              </div>

              {contract.specialConditions && (
                <p className="pt-1">
                  <strong>ข้อ 7. เงื่อนไขและข้อตกลงพิเศษ:</strong> {contract.specialConditions}
                </p>
              )}
            </div>

            <p className="indent-8 text-justify pt-3">
              สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความโดยตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
            </p>
          </div>

          {/* Signatures Columns */}
          <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs text-slate-600 font-sans">
            <div className="space-y-10">
              <p className="font-semibold text-slate-900">ลงชื่อ......................................................ผู้ให้เช่า</p>
              <p>( {contract.lessorSignatureName || contract.lessorName} )</p>
            </div>

            <div className="space-y-10">
              <p className="font-semibold text-slate-900">ลงชื่อ......................................................ผู้เช่า</p>
              <p>( {contract.lesseeSignatureName || contract.lesseeName} )</p>
            </div>

            <div className="space-y-10">
              <p className="font-semibold text-slate-900">ลงชื่อ......................................................พยาน</p>
              <p>( {contract.witnessName1 || 'เจ้าหน้าที่นิติบุคคล'} )</p>
            </div>

            <div className="space-y-10">
              <p className="font-semibold text-slate-900">ลงชื่อ......................................................พยาน</p>
              <p>( {contract.witnessName2 || 'พยาน'} )</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
