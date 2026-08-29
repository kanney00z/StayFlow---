export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount).replace('THB', '฿');
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}

export function formatDateThai(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTimeThai(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function addMonthsToDate(dateString: string, months: number): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const day = parseInt(parts[2], 10);

    const targetDate = new Date(year, month + months, day);
    // If day overflowed to next month (e.g., Aug 31 + 1 month -> Oct 1 because Sept has 30 days), snap to last day of target month
    if (targetDate.getDate() !== day) {
      targetDate.setDate(0);
    }

    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return dateString;
  }
}

export function addDaysToDate(dateString: string, days: number): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const targetDate = new Date(year, month, day + days);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return dateString;
  }
}

export function getStatusBadgeInfo(status: string) {
  switch (status) {
    case 'available':
      return { label: 'ห้องว่างพร้อมอยู่', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'occupied':
      return { label: 'มีผู้เช่าพักอยู่', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'reserved':
      return { label: 'ติดจองแล้ว', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'cleaning':
      return { label: 'กำลังทำความสะอาด', color: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'maintenance':
      return { label: 'ปิดปรับปรุง/ซ่อม', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'paid':
      return { label: 'ชำระเงินแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'unpaid':
      return { label: 'รอชำระเงิน', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'overdue':
      return { label: 'เกินกำหนดชำระ', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export function isRoomAvailableForDates(
  room: { id: string; number: string; status: string; currentTenant?: any },
  rentalType: 'daily' | 'monthly',
  checkInDate: string,
  checkOutDate: string,
  monthlyContractMonths: number,
  bookings: Array<{ roomId: string; checkInDate: string; checkOutDate: string; paymentStatus?: string; rentalType?: string }>
): { available: boolean; reason?: string } {
  // 1. Maintenance
  if (room.status === 'maintenance') {
    return { available: false, reason: 'ห้องพักอยู่ระหว่างปิดปรับปรุง' };
  }

  // 2. Active Tenant in room
  if (room.status === 'occupied' || Boolean(room.currentTenant)) {
    return { available: false, reason: 'ห้องพักมีผู้เช่าพักอาศัยอยู่แล้ว' };
  }

  // Calculate requested date bounds
  const reqStart = checkInDate;
  const reqEnd = rentalType === 'daily'
    ? checkOutDate
    : addMonthsToDate(checkInDate, monthlyContractMonths);

  if (!reqStart || !reqEnd) {
    return { available: true };
  }

  // 3. Check overlapping bookings for this specific room
  const activeBookings = (bookings || []).filter(
    (b) => b.roomId === room.id && b.paymentStatus !== 'cancelled'
  );

  for (const b of activeBookings) {
    const bStart = b.checkInDate;
    const bEnd = b.checkOutDate;
    // Overlap: reqStart < bEnd && reqEnd > bStart
    if (bStart && bEnd && reqStart < bEnd && reqEnd > bStart) {
      return {
        available: false,
        reason: b.rentalType === 'daily'
          ? `มีผู้จองแล้ว (${formatDateThai(bStart)} - ${formatDateThai(bEnd)})`
          : `ติดสัญญาเช่ารายเดือน (${formatDateThai(bStart)} - ${formatDateThai(bEnd)})`,
      };
    }
  }

  // 4. If status is reserved
  if (room.status === 'reserved') {
    return { available: false, reason: 'ห้องพักติดจองแล้ว' };
  }

  return { available: true };
}

