import React, { useState, useEffect } from 'react';
import { Check, Copy, ShieldCheck, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { generatePromptPayPayload, generatePromptPayQRDataUrl } from '../../utils/promptpay';

interface PromptPayQRProps {
  amount: number;
  promptPayId: string;
  accountName: string;
  billNumber?: string;
  showDownload?: boolean;
}

export const PromptPayQR: React.FC<PromptPayQRProps> = ({
  amount,
  promptPayId,
  accountName,
  billNumber,
  showDownload = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Generate real EMVCo PromptPay QR Code
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function makeQR() {
      try {
        const idToUse = promptPayId || '0812345678';
        const url = await generatePromptPayQRDataUrl(idToUse, amount);
        if (isMounted) {
          setQrDataUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to generate real PromptPay QR', err);
        if (isMounted) {
          setError('ไม่สามารถสร้าง QR Code ได้');
          setLoading(false);
        }
      }
    }

    makeQR();

    return () => {
      isMounted = false;
    };
  }, [promptPayId, amount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptPayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `PromptPay-QR-${billNumber || 'Payment'}-${amount}THB.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white text-slate-900 rounded-3xl p-5 border border-slate-200 shadow-xl max-w-sm mx-auto flex flex-col items-center select-none">
      {/* PromptPay Official Style Top Banner */}
      <div className="w-full bg-[#1A3762] text-white py-2.5 px-4 rounded-2xl flex items-center justify-between mb-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center font-bold text-[#1A3762] text-xs shadow-xs">
            PP
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide block leading-none">Thai QR Payment</span>
            <span className="text-[10px] text-sky-200 font-normal">พร้อมเพย์ PromptPay</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-[10px] font-semibold text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>มาตรฐาน EMVCo</span>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="relative p-3.5 bg-white border-2 border-slate-200/90 rounded-2xl shadow-inner mb-3 flex flex-col items-center justify-center min-w-[220px] min-h-[220px]">
        {loading ? (
          <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs">กำลังสร้าง QR Code...</span>
          </div>
        ) : error ? (
          <div className="w-48 h-48 flex flex-col items-center justify-center text-rose-500 gap-2 text-center p-2">
            <AlertCircle className="w-6 h-6" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        ) : qrDataUrl ? (
          <div className="relative flex flex-col items-center">
            {/* Real Scannable QR Code Image */}
            <div className="p-1 bg-white rounded-xl shadow-xs">
              <img
                src={qrDataUrl}
                alt="PromptPay QR Code"
                className="w-48 h-48 object-contain rounded-lg"
              />
            </div>
            
            {/* Center PromptPay TH Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-[#1A3762] text-white border-2 border-white px-2 py-0.5 rounded-md font-bold text-[10px] shadow-md tracking-wider">
                TH
              </div>
            </div>
          </div>
        ) : null}

        <p className="text-[11px] text-slate-600 mt-2 font-medium text-center flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>สแกนจ่ายผ่านแอปพลิเคชันธนาคารทุกแห่ง</span>
        </p>
      </div>

      {/* Payment details */}
      <div className="w-full text-center space-y-2 border-t border-slate-100 pt-3">
        <div>
          <p className="text-xs text-slate-500 font-medium">ยอดชำระสุทธิ (Amount)</p>
          <p className="text-2xl font-black text-emerald-600 tracking-tight font-mono">
            {formatCurrency(amount)}
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 text-left text-xs space-y-1.5 border border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">ชื่อบัญชีรับเงิน:</span>
            <span className="font-semibold text-slate-900">{accountName || 'หอพัก/อพาร์ตเมนต์'}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-500">เบอร์พร้อมเพย์:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {promptPayId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                title="คัดลอกเบอร์พร้อมเพย์"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {billNumber && (
            <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-slate-200/60">
              <span className="text-slate-400">เลขอ้างอิงบิล:</span>
              <span className="font-mono font-medium text-slate-700">{billNumber}</span>
            </div>
          )}
        </div>

        {showDownload && qrDataUrl && (
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>บันทึกรูปภาพ QR Code ลงเครื่อง</span>
          </button>
        )}
      </div>
    </div>
  );
};
