import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DoorClosed, Plus, Search, Filter, Edit3, Trash2, 
  Droplets, Zap, Check, Eye, User, Phone, Calendar,
  ShieldAlert, Sparkles, BedDouble, ArrowUpDown, Image as ImageIcon,
  History, FileText
} from 'lucide-react';
import { Room, RoomStatus, RoomType, UtilityBill, PropertyProfile } from '../../types';
import { formatCurrency, getStatusBadgeInfo } from '../../utils/formatters';
import { RoomImageManager } from './RoomImageManager';
import { RoomBillHistoryModal } from './RoomBillHistoryModal';

interface RoomManagementProps {
  rooms: Room[];
  onUpdateRoomStatus: (roomId: string, newStatus: RoomStatus) => void;
  onUpdateRoom: (updatedRoom: Room) => void;
  onAddRoom: (newRoom: Room) => void;
  onDeleteRoom: (roomId: string) => void;
  onSelectRoomForBill: (room: Room) => void;
  bills?: UtilityBill[];
  property?: PropertyProfile;
  onOpenInvoiceModal?: (bill: UtilityBill) => void;
  onUpdateBillStatus?: (billId: string, status: 'paid' | 'unpaid') => void;
  onDeleteBill?: (billId: string) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  rooms,
  onUpdateRoomStatus,
  onUpdateRoom,
  onAddRoom,
  onDeleteRoom,
  onSelectRoomForBill,
  bills = [],
  property,
  onOpenInvoiceModal,
  onUpdateBillStatus,
  onDeleteBill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [selectedRoomForHistory, setSelectedRoomForHistory] = useState<Room | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageOnlyModal, setShowImageOnlyModal] = useState(false);
  const [activeTabInModal, setActiveTabInModal] = useState<'info' | 'images' | 'amenities'>('info');

  // New room state
  const [newRoomData, setNewRoomData] = useState<Partial<Room>>({
    number: '',
    floor: 1,
    building: 'อาคาร A (Garden View)',
    type: 'Deluxe',
    status: 'available',
    dailyRate: 890,
    monthlyRate: 5000,
    depositMonthly: 10000,
    sizeSqm: 32,
    bedType: 'เตียงคิงไซส์ 6 ฟุต (King Bed)',
    maxGuests: 2,
    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'],
    amenities: ['เครื่องปรับอากาศ Inverter', 'Smart TV 50 นิ้ว', 'ตู้เย็น', 'เครื่องทำน้ำอุ่น', 'Wi-Fi 500Mbps'],
    description: 'ห้องพักตกแต่งสไตล์โมเดิร์น เฟอร์นิเจอร์ครบชุด พร้อมระเบียงส่วนตัว',
    previousWaterMeter: 0,
    currentWaterMeter: 0,
    previousElecMeter: 0,
    currentElecMeter: 0,
  });

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (floorFilter !== 'all' && r.floor.toString() !== floorFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.number.toLowerCase().includes(q) || (r.currentTenant?.name.toLowerCase().includes(q));
    }
    return true;
  });

  const floors = Array.from(new Set(rooms.map((r) => r.floor.toString()))).sort();
  const roomTypes: RoomType[] = ['Standard', 'Deluxe', 'Studio', 'Executive Suite', 'Family Suite'];

  const handleSaveAddRoom = () => {
    if (!newRoomData.number) return;
    const room: Room = {
      id: `room-${Date.now()}`,
      number: newRoomData.number,
      floor: Number(newRoomData.floor) || 1,
      building: newRoomData.building || 'อาคาร A',
      type: (newRoomData.type as RoomType) || 'Deluxe',
      status: (newRoomData.status as RoomStatus) || 'available',
      dailyRate: Number(newRoomData.dailyRate) || 890,
      monthlyRate: Number(newRoomData.monthlyRate) || 5000,
      depositMonthly: Number(newRoomData.depositMonthly) || 10000,
      sizeSqm: Number(newRoomData.sizeSqm) || 30,
      bedType: newRoomData.bedType || 'เตียงคิงไซส์ 6 ฟุต',
      maxGuests: Number(newRoomData.maxGuests) || 2,
      images: (newRoomData.images && newRoomData.images.length > 0)
        ? newRoomData.images
        : ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'],
      amenities: newRoomData.amenities || ['แอร์', 'ทีวี', 'ตู้เย็น', 'เครื่องทำน้ำอุ่น'],
      description: newRoomData.description || 'ห้องพักใหม่พร้อมเข้าอยู่',
      previousWaterMeter: Number(newRoomData.previousWaterMeter) || 0,
      currentWaterMeter: Number(newRoomData.currentWaterMeter) || 0,
      previousElecMeter: Number(newRoomData.previousElecMeter) || 0,
      currentElecMeter: Number(newRoomData.currentElecMeter) || 0,
    };
    onAddRoom(room);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DoorClosed className="w-6 h-6 text-indigo-600" />
            <span>จัดการห้องพัก & รูปภาพ (Room Management)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ปรับเปลี่ยนสถานะห้อง ใส่รูปห้องพักได้เอง อัปเดตมิเตอร์ และกำหนดราคาค่าเช่ารายวัน-รายเดือน
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewRoomData({
              number: '',
              floor: 1,
              building: 'อาคาร A',
              type: 'Deluxe',
              status: 'available',
              dailyRate: 890,
              monthlyRate: 5000,
              depositMonthly: 10000,
              sizeSqm: 32,
              bedType: 'เตียงคิงไซส์ 6 ฟุต (King Bed)',
              maxGuests: 2,
              images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'],
              amenities: ['เครื่องปรับอากาศ Inverter', 'Smart TV 50 นิ้ว', 'ตู้เย็น', 'เครื่องทำน้ำอุ่น', 'Wi-Fi 500Mbps'],
              description: 'ห้องพักตกแต่งสไตล์โมเดิร์น เฟอร์นิเจอร์ครบชุด พร้อมระเบียงส่วนตัว',
              previousWaterMeter: 0,
              currentWaterMeter: 0,
              previousElecMeter: 0,
              currentElecMeter: 0,
            });
            setActiveTabInModal('info');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มห้องพักใหม่</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขห้อง หรือชื่อผู้เช่า..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">ทุกสถานะห้อง</option>
            <option value="available">ห้องว่าง (Available)</option>
            <option value="occupied">มีผู้เช่า (Occupied)</option>
            <option value="reserved">ติดจอง (Reserved)</option>
            <option value="cleaning">ทำความสะอาด (Cleaning)</option>
            <option value="maintenance">ปิดซ่อม (Maintenance)</option>
          </select>

          {/* Floor Filter */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">ทุกชั้น</option>
            {floors.map((f) => (
              <option key={f} value={f}>ชั้น {f}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">ทุกประเภทห้อง</option>
            {roomTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          พบทั้งหมด <span className="font-bold text-slate-900">{filteredRooms.length}</span> ห้อง
        </div>
      </div>

      {/* Rooms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const badge = getStatusBadgeInfo(room.status);
          const isOccupied = room.status === 'occupied';
          const coverImage = room.images && room.images.length > 0
            ? room.images[0]
            : 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';

          return (
            <motion.div
              key={room.id}
              whileHover={{ y: -3 }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Room Image Preview */}
              <div className="relative h-44 w-full overflow-hidden bg-slate-100 group">
                <img
                  src={coverImage}
                  alt={`ห้อง ${room.number}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-black/20"></div>

                {/* Top Badge Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="bg-white/95 text-slate-900 font-mono font-black text-sm px-2.5 py-1 rounded-xl shadow-xs">
                    {room.number}
                  </span>
                  <span className="text-[11px] font-semibold text-white bg-black/50 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                    ชั้น {room.floor}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-xs ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Quick Photo Badge / Edit trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowImageOnlyModal(true);
                  }}
                  className="absolute bottom-2.5 right-3 bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium px-2 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="คลิกเพื่อจัดการรูปภาพห้องนี้"
                >
                  <ImageIcon className="w-3 h-3 text-indigo-300" />
                  <span>{room.images?.length || 0} รูป</span>
                </button>

                <div className="absolute bottom-2.5 left-3 text-white text-xs font-medium">
                  <span className="bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {room.type} • {room.sizeSqm} ตร.ม.
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                {/* Rates display */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-medium">รายเดือน</span>
                    <span className="font-bold text-indigo-600 font-mono text-sm">
                      {formatCurrency(room.monthlyRate || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-medium">รายวัน</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">
                      {formatCurrency(room.dailyRate || 0)}
                      <span className="text-[10px] text-slate-400 font-normal">/คืน</span>
                    </span>
                  </div>
                </div>

                {/* Tenant / Status Info */}
                {isOccupied && room.currentTenant ? (
                  <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="truncate">{room.currentTenant.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{room.currentTenant.phone}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 line-clamp-2">
                    {room.description}
                  </div>
                )}

                {/* Live Meters */}
                <div className="flex items-center justify-between text-xs font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1 text-cyan-700">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>น้ำ: {room.currentWaterMeter}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-700">
                    <Zap className="w-3.5 h-3.5" />
                    <span>ไฟ: {room.currentElecMeter}</span>
                  </div>
                </div>

                {/* Electricity / Bill History Quick Trigger */}
                {(() => {
                  const roomBillsCount = bills.filter(b => b.roomId === room.id || b.roomNumber === room.number).length;
                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedRoomForHistory(room)}
                      className="w-full py-1.5 px-3 bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                      title={`คลิกเพื่อดูประวัติการบันทึกค่าไฟ ${roomBillsCount} ครั้งของห้อง ${room.number}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-amber-600" />
                        <span>ประวัติค่าไฟ & บิล</span>
                      </span>
                      <span className="bg-amber-200/70 text-amber-950 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                        {roomBillsCount} ครั้ง
                      </span>
                    </button>
                  );
                })()}

                {/* Quick Status Select & Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <select
                    value={room.status}
                    onChange={(e) => onUpdateRoomStatus(room.id, e.target.value as RoomStatus)}
                    className="bg-slate-50 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 border border-slate-200 outline-none flex-1 cursor-pointer focus:bg-white"
                  >
                    <option value="available">🟢 ว่างพร้อมอยู่</option>
                    <option value="occupied">🔵 มีผู้เช่า</option>
                    <option value="reserved">🟡 ติดจอง</option>
                    <option value="cleaning">⚪ กำลังทำความสะอาด</option>
                    <option value="maintenance">🔴 ปิดซ่อมบำรุง</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setSelectedRoomForHistory(room)}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors cursor-pointer border border-amber-200/60"
                    title="ดูประวัติการบันทึกค่าไฟของห้องนี้"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoom(room);
                      setActiveTabInModal('images');
                      setShowEditModal(true);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                    title="จัดการรูปภาพห้องนี้"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoom(room);
                      setActiveTabInModal('info');
                      setShowEditModal(true);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="แก้ไขข้อมูลห้อง"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomToDelete(room)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                    title="ลบห้องพักนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Image Only Modal */}
      <AnimatePresence>
        {showImageOnlyModal && selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">จัดการรูปภาพห้องพัก</span>
                  <h3 className="text-lg font-bold text-slate-900">
                    รูปภาพห้อง {selectedRoom.number} ({selectedRoom.type})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageOnlyModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <RoomImageManager
                images={selectedRoom.images || []}
                onChangeImages={(updatedImages) => {
                  const updated = { ...selectedRoom, images: updatedImages };
                  setSelectedRoom(updated);
                  onUpdateRoom(updated);
                }}
              />

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImageOnlyModal(false)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-100 cursor-pointer"
                >
                  บันทึกรูปภาพ & ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Room Modal */}
      <AnimatePresence>
        {showEditModal && selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  <span>แก้ไขข้อมูลห้อง {selectedRoom.number}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Sub-tabs inside modal */}
              <div className="flex border-b border-slate-100 gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTabInModal('info')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    activeTabInModal === 'info'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ข้อมูลทั่วไป & ราคา
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabInModal('images')}
                  className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTabInModal === 'images'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>รูปภาพห้องพัก ({selectedRoom.images?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabInModal('amenities')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    activeTabInModal === 'amenities'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  สิ่งอำนวยความสะดวก & รายละเอียด
                </button>
              </div>

              {activeTabInModal === 'images' && (
                <RoomImageManager
                  images={selectedRoom.images || []}
                  onChangeImages={(updatedImages) => {
                    setSelectedRoom({ ...selectedRoom, images: updatedImages });
                  }}
                />
              )}

              {activeTabInModal === 'info' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">หมายเลขห้อง</label>
                      <input
                        type="text"
                        value={selectedRoom.number}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, number: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ประเภทห้อง</label>
                      <select
                        value={selectedRoom.type}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, type: e.target.value as RoomType })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                      >
                        {roomTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ค่าเช่ารายเดือน (บาท/เดือน)</label>
                      <input
                        type="number"
                        value={selectedRoom.monthlyRate}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, monthlyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ค่าเช่ารายวัน (บาท/คืน)</label>
                      <input
                        type="number"
                        value={selectedRoom.dailyRate}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, dailyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">เงินประกันรายเดือน (บาท)</label>
                      <input
                        type="number"
                        value={selectedRoom.depositMonthly}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, depositMonthly: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ขนาดห้อง (ตร.ม.)</label>
                      <input
                        type="number"
                        value={selectedRoom.sizeSqm}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, sizeSqm: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ชั้นที่</label>
                      <input
                        type="number"
                        value={selectedRoom.floor}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, floor: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">รูปแบบเตียงนอน</label>
                      <input
                        type="text"
                        value={selectedRoom.bedType}
                        onChange={(e) => setSelectedRoom({ ...selectedRoom, bedType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTabInModal === 'amenities' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">คำอธิบายห้องพัก</label>
                    <textarea
                      rows={3}
                      value={selectedRoom.description}
                      onChange={(e) => setSelectedRoom({ ...selectedRoom, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">
                      สิ่งอำนวยความสะดวก (คั่นด้วยเครื่องหมายจุลภาค ,)
                    </label>
                    <input
                      type="text"
                      value={selectedRoom.amenities?.join(', ') || ''}
                      onChange={(e) => setSelectedRoom({
                        ...selectedRoom,
                        amenities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedRoom;
                    setShowEditModal(false);
                    setRoomToDelete(target);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบห้องพักนี้</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateRoom(selectedRoom);
                      setShowEditModal(false);
                    }}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-100 cursor-pointer"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Room Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <span>เพิ่มห้องพักใหม่เข้าสู่ระบบ</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Sub-tabs in Add modal */}
              <div className="flex border-b border-slate-100 gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTabInModal('info')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    activeTabInModal === 'info'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ข้อมูลทั่วไป & ราคา
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabInModal('images')}
                  className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTabInModal === 'images'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>รูปภาพห้องพัก ({newRoomData.images?.length || 0})</span>
                </button>
              </div>

              {activeTabInModal === 'images' && (
                <RoomImageManager
                  images={newRoomData.images || []}
                  onChangeImages={(imgs) => setNewRoomData({ ...newRoomData, images: imgs })}
                />
              )}

              {activeTabInModal === 'info' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">หมายเลขห้อง (Room No.) *</label>
                      <input
                        type="text"
                        placeholder="เช่น 501"
                        value={newRoomData.number}
                        onChange={(e) => setNewRoomData({ ...newRoomData, number: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ชั้นที่ (Floor)</label>
                      <input
                        type="number"
                        value={newRoomData.floor}
                        onChange={(e) => setNewRoomData({ ...newRoomData, floor: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ประเภทห้อง (Room Type)</label>
                      <select
                        value={newRoomData.type}
                        onChange={(e) => setNewRoomData({ ...newRoomData, type: e.target.value as RoomType })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
                      >
                        {roomTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">อาคาร (Building)</label>
                      <input
                        type="text"
                        value={newRoomData.building}
                        onChange={(e) => setNewRoomData({ ...newRoomData, building: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ค่าเช่ารายเดือน (บาท/เดือน)</label>
                      <input
                        type="number"
                        value={newRoomData.monthlyRate}
                        onChange={(e) => setNewRoomData({ ...newRoomData, monthlyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">ค่าเช่ารายวัน (บาท/คืน)</label>
                      <input
                        type="number"
                        value={newRoomData.dailyRate}
                        onChange={(e) => setNewRoomData({ ...newRoomData, dailyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">มิเตอร์น้ำเริ่มต้น</label>
                      <input
                        type="number"
                        value={newRoomData.currentWaterMeter}
                        onChange={(e) => setNewRoomData({ 
                          ...newRoomData, 
                          currentWaterMeter: parseFloat(e.target.value) || 0,
                          previousWaterMeter: parseFloat(e.target.value) || 0,
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-cyan-800 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1 font-medium">มิเตอร์ไฟเริ่มต้น</label>
                      <input
                        type="number"
                        value={newRoomData.currentElecMeter}
                        onChange={(e) => setNewRoomData({ 
                          ...newRoomData, 
                          currentElecMeter: parseFloat(e.target.value) || 0,
                          previousElecMeter: parseFloat(e.target.value) || 0,
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-amber-800 font-mono focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-medium">คำอธิบายห้องพัก</label>
                    <textarea
                      rows={2}
                      value={newRoomData.description}
                      onChange={(e) => setNewRoomData({ ...newRoomData, description: e.target.value })}
                      placeholder="ระบุจุดเด่น เช่น วิวสระว่ายน้ำ, เฟอร์นิเจอร์ครบ..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                    ></textarea>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveAddRoom}
                  disabled={!newRoomData.number}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-100 cursor-pointer"
                >
                  สร้างห้องใหม่
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Room Confirmation Modal */}
      <AnimatePresence>
        {roomToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  ยืนยันการลบห้องพัก {roomToDelete.number} ({roomToDelete.type})?
                </h3>
                <p className="text-xs text-slate-500">
                  การลบห้องพักนี้จะลบข้อมูลห้องออกจากระบบอย่างถาวร
                </p>
              </div>

              {roomToDelete.status === 'occupied' && roomToDelete.currentTenant && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>แจ้งเตือน: ห้องนี้มีผู้เช่าอยู่</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    ผู้เช่าปัจจุบัน: <strong>{roomToDelete.currentTenant.name}</strong> ({roomToDelete.currentTenant.phone})
                  </p>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>หมายเลขห้อง:</span>
                  <span className="font-mono font-bold text-slate-800">{roomToDelete.number} (ชั้น {roomToDelete.floor})</span>
                </div>
                <div className="flex justify-between">
                  <span>ค่าเช่ารายเดือน:</span>
                  <span className="font-mono text-slate-800">{formatCurrency(roomToDelete.monthlyRate)}/เดือน</span>
                </div>
                <div className="flex justify-between">
                  <span>สถานะปัจจุบัน:</span>
                  <span className="font-bold text-slate-800">{getStatusBadgeInfo(roomToDelete.status).label}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRoomToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRoom(roomToDelete.id);
                    setRoomToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบห้องพักทันที</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Room Bill History Modal */}
      <AnimatePresence>
        {selectedRoomForHistory && (
          <RoomBillHistoryModal
            room={selectedRoomForHistory}
            bills={bills}
            property={property}
            onClose={() => setSelectedRoomForHistory(null)}
            onOpenInvoiceModal={(bill) => {
              if (onOpenInvoiceModal) {
                onOpenInvoiceModal(bill);
              }
            }}
            onUpdateBillStatus={onUpdateBillStatus}
            onDeleteBill={onDeleteBill}
            onGoToRecordMeter={(room) => {
              setSelectedRoomForHistory(null);
              onSelectRoomForBill(room);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
