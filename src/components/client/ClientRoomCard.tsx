import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight, Image as ImageIcon, Lock, CheckCircle2 } from 'lucide-react';
import { Room, RentalType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ClientRoomCardProps {
  room: Room;
  rentalType: RentalType;
  pricing: {
    unitRate: number;
    roomTotal: number;
    deposit: number;
    grandTotal: number;
  };
  isAvailable?: boolean;
  unavailableReason?: string;
  onOpenBooking: (room: Room) => void;
}

export const ClientRoomCard: React.FC<ClientRoomCardProps> = ({
  room,
  rentalType,
  pricing,
  isAvailable = true,
  unavailableReason,
  onOpenBooking,
}) => {
  const images = (room.images && room.images.length > 0)
    ? room.images
    : ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      whileHover={isAvailable ? { y: -4 } : {}}
      className={`bg-white border rounded-3xl overflow-hidden flex flex-col justify-between group transition-all ${
        isAvailable
          ? 'border-slate-200 shadow-xs hover:shadow-md'
          : 'border-slate-200 bg-slate-50/50 shadow-none opacity-90'
      }`}
    >
      {/* Photo Carousel Preview */}
      <div className="relative h-60 w-full overflow-hidden bg-slate-100">
        <img
          src={images[currentImageIndex]}
          alt={`${room.type} ห้อง ${room.number} รูปที่ ${currentImageIndex + 1}`}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isAvailable ? 'group-hover:scale-105' : 'grayscale-[20%]'
          }`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none"></div>

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
          <span className="bg-white/95 text-slate-900 font-mono font-bold text-xs px-3 py-1 rounded-xl shadow-sm backdrop-blur-md">
            ห้อง {room.number}
          </span>
          <span className="bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-lg backdrop-blur-xs">
            ชั้น {room.floor}
          </span>
        </div>

        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
          {isAvailable ? (
            <span className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse"></span>
              <span>ว่างพร้อมจอง</span>
            </span>
          ) : (
            <span className="bg-rose-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>ติดจอง / ไม่ว่าง</span>
            </span>
          )}
          <span className="bg-indigo-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-xl shadow-xs">
            {room.type}
          </span>
        </div>

        {/* Left / Right Carousel Controls if multiple images */}
        {images.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={prevImage}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer shadow-md"
              title="ดูรูปก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-transform hover:scale-110 cursor-pointer shadow-md"
              title="ดูรูปถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Image index indicators (dots) */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(idx);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentImageIndex ? 'w-4 bg-white' : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute bottom-3 left-3 text-white text-xs pointer-events-none">
          <span className="bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
            {room.sizeSqm} ตร.ม. • สูงสุด {room.maxGuests} ท่าน
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className={`font-bold text-lg transition-colors ${
              isAvailable ? 'text-slate-900 group-hover:text-indigo-600' : 'text-slate-700'
            }`}>
              {room.type} ({room.number})
            </h3>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {room.description}
          </p>

          {/* Amenities tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {room.amenities.slice(0, 4).map((amenity, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
              >
                {amenity}
              </span>
            ))}
            {room.amenities.length > 4 && (
              <span className="px-1.5 py-0.5 rounded-lg bg-slate-50 text-slate-400 text-[10px]">
                +{room.amenities.length - 4}
              </span>
            )}
          </div>

          {/* Unavailable Reason Banner if not available */}
          {!isAvailable && (
            <div className="mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span className="font-medium">{unavailableReason || 'ห้องนี้ไม่ว่างในช่วงเวลาดังกล่าว'}</span>
            </div>
          )}
        </div>

        {/* Pricing and Action Bar */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="text-[11px] text-slate-500 block">
                {rentalType === 'daily' ? 'ราคาต่อคืน' : 'ค่าเช่าต่อเดือน'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {formatCurrency(pricing.unitRate)}
                </span>
                <span className="text-xs text-slate-500">/{rentalType === 'daily' ? 'คืน' : 'เดือน'}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">รวมค่าห้อง</span>
              <span className="text-sm font-bold text-indigo-600 font-mono">
                {formatCurrency(pricing.roomTotal)}
              </span>
            </div>
          </div>

          {isAvailable ? (
            <button
              type="button"
              onClick={() => onOpenBooking(room)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>จองห้องพักทันที</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed select-none"
              title="ห้องนี้มีผู้จองหรือเข้าพักแล้ว ไม่สามารถทำการจองซ้ำได้"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>ห้องไม่ว่าง (ไม่สามารถจองได้)</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
