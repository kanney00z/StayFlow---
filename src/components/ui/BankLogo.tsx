import React from 'react';
import { ThaiBank, getBankByCodeOrName, THAI_BANKS } from '../../utils/thaiBanks';

interface BankLogoProps {
  bank?: ThaiBank | string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
  showCode?: boolean;
}

export const BankLogo: React.FC<BankLogoProps> = ({
  bank,
  size = 'md',
  className = '',
  showName = false,
  showCode = false,
}) => {
  const bankObj: ThaiBank = typeof bank === 'string'
    ? (getBankByCodeOrName(bank) || {
        id: 'other',
        code: 'BANK',
        officialName: bank,
        shortNameTh: bank,
        shortNameEn: bank,
        color: '#475569',
        textColor: '#ffffff',
      })
    : bank || {
        id: 'other',
        code: 'BANK',
        officialName: 'ธนาคารทั่วไป',
        shortNameTh: 'ธนาคาร',
        shortNameEn: 'Bank',
        color: '#475569',
        textColor: '#ffffff',
      };

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px] rounded-md',
    sm: 'w-7 h-7 text-[10px] rounded-lg',
    md: 'w-9 h-9 text-xs rounded-xl',
    lg: 'w-11 h-11 text-sm rounded-2xl',
    xl: 'w-14 h-14 text-base rounded-2xl',
  };

  const renderIcon = () => {
    switch (bankObj.code) {
      case 'KBANK':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <circle cx="50" cy="50" r="46" fill="#138F2D" />
            <path
              d="M32 24 H42 L58 48 L42 74 H32 L48 48 Z"
              fill="#FFFFFF"
            />
            <path
              d="M54 24 H64 L74 40 L64 40 Z"
              fill="#FFFFFF"
            />
            <path
              d="M64 56 L74 56 L64 74 H54 Z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'SCB':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#4E2E7F" />
            <path
              d="M50 18 C50 18 30 38 30 58 C30 70 39 78 50 82 C61 78 70 70 70 58 C70 38 50 18 50 18 Z"
              fill="#FECC00"
            />
            <circle cx="50" cy="56" r="12" fill="#4E2E7F" />
            <circle cx="50" cy="56" r="6" fill="#FECC00" />
          </svg>
        );

      case 'BBL':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#1E3F8B" />
            {/* Lotus emblem */}
            <path
              d="M50 20 L62 46 C66 54 62 66 50 78 C38 66 34 54 38 46 Z"
              fill="#F58220"
            />
            <path
              d="M50 26 L58 46 C60 52 56 60 50 68 C44 60 40 52 42 46 Z"
              fill="#FFFFFF"
            />
            <circle cx="50" cy="48" r="4" fill="#1E3F8B" />
          </svg>
        );

      case 'KTB':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <circle cx="50" cy="50" r="46" fill="#00A5E5" />
            {/* Vayupak bird stylized */}
            <path
              d="M50 22 C42 32 32 40 22 42 C30 50 42 56 50 78 C58 56 70 50 78 42 C68 40 58 32 50 22 Z"
              fill="#FFFFFF"
            />
            <circle cx="50" cy="44" r="5" fill="#00A5E5" />
          </svg>
        );

      case 'BAY':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#FEC43B" />
            {/* Krungsri 3 gables */}
            <path d="M50 22 L72 40 H28 Z" fill="#4A3800" />
            <path d="M50 42 L76 60 H24 Z" fill="#4A3800" />
            <path d="M50 62 L80 78 H20 Z" fill="#4A3800" />
          </svg>
        );

      case 'TTB':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#002D63" />
            {/* Modern ttb logo text */}
            <text
              x="50"
              y="62"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="34"
              letterSpacing="-2"
            >
              tt<tspan fill="#EE3124">b</tspan>
            </text>
          </svg>
        );

      case 'GSB':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#EB1985" />
            {/* Wachirawut emblem crown in gold */}
            <circle cx="50" cy="50" r="32" stroke="#FFDF6D" strokeWidth="4" fill="none" />
            <path
              d="M50 28 L56 46 H44 Z M50 48 L62 66 H38 Z"
              fill="#FFDF6D"
            />
            <circle cx="50" cy="50" r="4" fill="#EB1985" />
          </svg>
        );

      case 'BAAC':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#1B7340" />
            <path
              d="M50 24 C64 24 74 34 74 50 C74 68 50 80 50 80 C50 80 26 68 26 50 C26 34 36 24 50 24 Z"
              fill="#FFFFFF"
            />
            <path
              d="M50 32 L56 46 C56 56 50 68 50 68 C50 68 44 56 44 46 Z"
              fill="#1B7340"
            />
          </svg>
        );

      case 'UOB':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#0B2D64" />
            {/* 5 red gate stripes */}
            <rect x="24" y="30" width="8" height="40" rx="3" fill="#CF1322" />
            <rect x="36" y="24" width="8" height="52" rx="3" fill="#CF1322" />
            <rect x="48" y="20" width="8" height="60" rx="3" fill="#FFFFFF" />
            <rect x="60" y="24" width="8" height="52" rx="3" fill="#CF1322" />
            <rect x="72" y="30" width="8" height="40" rx="3" fill="#CF1322" />
          </svg>
        );

      case 'CIMB':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none">
            <rect width="100" height="100" rx="24" fill="#7D181E" />
            <polygon points="50,22 76,46 50,78 24,46" fill="#FFFFFF" />
            <polygon points="50,30 68,46 50,68 32,46" fill="#7D181E" />
          </svg>
        );

      case 'PROMPTPAY':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <rect width="100" height="100" rx="24" fill="#003D6B" />
            <circle cx="40" cy="50" r="18" stroke="#FFFFFF" strokeWidth="7" fill="none" />
            <circle cx="60" cy="50" r="18" stroke="#00A5E5" strokeWidth="7" fill="none" />
          </svg>
        );

      default:
        return (
          <div
            className="w-full h-full flex flex-col items-center justify-center font-bold font-mono"
            style={{ backgroundColor: bankObj.color, color: bankObj.textColor }}
          >
            <span className="leading-none text-[11px]">{bankObj.code.slice(0, 4)}</span>
          </div>
        );
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} shrink-0 flex items-center justify-center overflow-hidden shadow-xs border border-black/10`}
        style={{ backgroundColor: bankObj.color }}
        title={bankObj.officialName}
      >
        {renderIcon()}
      </div>

      {(showName || showCode) && (
        <div className="flex flex-col leading-tight">
          {showName && (
            <span className="font-semibold text-slate-900 text-xs sm:text-sm">
              {bankObj.officialName}
            </span>
          )}
          {showCode && (
            <span className="text-[11px] text-slate-500 font-mono">
              {bankObj.code} • {bankObj.shortNameTh}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
