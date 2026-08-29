import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RoomManagement } from './components/admin/RoomManagement';
import { UtilityCalculator } from './components/admin/UtilityCalculator';
import { BookingTenantList } from './components/admin/BookingTenantList';
import { AdminSettings } from './components/admin/AdminSettings';
import { InvoiceModal } from './components/admin/InvoiceModal';
import { ClientBookingView } from './components/client/ClientBookingView';

import { 
  Room, Tenant, Booking, UtilityRateConfig, 
  UtilityBill, PropertyProfile, RoomStatus, LeaseContract 
} from './types';

import {
  INITIAL_PROPERTY_PROFILE,
  INITIAL_UTILITY_CONFIG,
  INITIAL_ROOMS,
  INITIAL_TENANTS,
  INITIAL_BOOKINGS,
  INITIAL_BILLS,
} from './data/initialData';

export default function App() {
  // Mode: Admin vs Client
  const [currentMode, setCurrentMode] = useState<'admin' | 'client'>('admin');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'rooms' | 'utilities' | 'bookings' | 'settings'>('dashboard');

  // Application Persistent / Memory States
  const [property, setProperty] = useState<PropertyProfile>(() => {
    const saved = localStorage.getItem('stayflow_property');
    return saved ? JSON.parse(saved) : INITIAL_PROPERTY_PROFILE;
  });

  const [utilityConfig, setUtilityConfig] = useState<UtilityRateConfig>(() => {
    const saved = localStorage.getItem('stayflow_utility_config');
    return saved ? JSON.parse(saved) : INITIAL_UTILITY_CONFIG;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem('stayflow_rooms');
      if (!saved) return INITIAL_ROOMS;
      const parsed: Room[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_ROOMS;
      return parsed.map((r) => ({
        ...r,
        dailyRate: typeof r.dailyRate === 'number' ? r.dailyRate : 890,
        monthlyRate: typeof r.monthlyRate === 'number' ? r.monthlyRate : 4000,
        depositMonthly: typeof r.depositMonthly === 'number' ? r.depositMonthly : 5000,
        images: Array.isArray(r.images) && r.images.length > 0 ? r.images : (INITIAL_ROOMS.find(ir => ir.id === r.id)?.images || ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80']),
      }));
    } catch {
      return INITIAL_ROOMS;
    }
  });

  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('stayflow_tenants');
    return saved ? JSON.parse(saved) : INITIAL_TENANTS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('stayflow_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [bills, setBills] = useState<UtilityBill[]>(() => {
    const saved = localStorage.getItem('stayflow_bills');
    return saved ? JSON.parse(saved) : INITIAL_BILLS;
  });

  // Active Invoice Modal state
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<UtilityBill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('stayflow_property', JSON.stringify(property));
  }, [property]);

  useEffect(() => {
    localStorage.setItem('stayflow_utility_config', JSON.stringify(utilityConfig));
  }, [utilityConfig]);

  useEffect(() => {
    localStorage.setItem('stayflow_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('stayflow_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('stayflow_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('stayflow_bills', JSON.stringify(bills));
  }, [bills]);

  // Handlers for Room updates
  const handleUpdateRoomStatus = (roomId: string, newStatus: RoomStatus) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));
  };

  const handleAddRoom = (newRoom: Room) => {
    setRooms(prev => [newRoom, ...prev]);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
    setTenants(prev => prev.filter(t => t.roomId !== roomId));
    setBills(prev => prev.filter(b => b.roomId !== roomId));
  };

  // Handlers for Meter update
  const handleUpdateRoomMeters = (roomId: string, newWater: number, newElec: number) => {
    setRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          previousWaterMeter: r.currentWaterMeter,
          currentWaterMeter: newWater,
          previousElecMeter: r.currentElecMeter,
          currentElecMeter: newElec,
          meterLastUpdated: new Date().toISOString().split('T')[0],
        };
      }
      return r;
    }));
  };

  // Handlers for Bills
  const handleGenerateBill = (newBill: UtilityBill) => {
    setBills(prev => {
      // If a bill with the exact same ID exists, update it; otherwise add as a new bill record
      const existingIdx = prev.findIndex(b => b.id === newBill.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newBill;
        return updated;
      }
      return [newBill, ...prev];
    });
  };

  const handleDeleteBill = (billId: string) => {
    setBills(prev => prev.filter(b => b.id !== billId));
  };

  const handleClearBills = () => {
    setBills([]);
  };

  const handleResetMeters = () => {
    setRooms(prev => prev.map(r => ({
      ...r,
      previousWaterMeter: 0,
      currentWaterMeter: 0,
      previousElecMeter: 0,
      currentElecMeter: 0,
    })));
  };

  const handleResetDemoData = () => {
    setProperty(INITIAL_PROPERTY_PROFILE);
    setUtilityConfig(INITIAL_UTILITY_CONFIG);
    setRooms(INITIAL_ROOMS);
    setTenants(INITIAL_TENANTS);
    setBookings(INITIAL_BOOKINGS);
    setBills(INITIAL_BILLS);
  };

  const handleUpdateBillStatus = (billId: string, status: 'paid' | 'unpaid' | 'partial') => {
    setBills(prev => prev.map(b => b.id === billId ? { 
      ...b, 
      paymentStatus: status,
      paidAmount: status === 'paid' ? b.grandTotal : (status === 'unpaid' ? 0 : b.paidAmount),
      remainingBalance: status === 'paid' ? 0 : (status === 'unpaid' ? b.grandTotal : b.remainingBalance),
      paidDate: status === 'paid' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined 
    } : b));

    if (selectedBillForInvoice && selectedBillForInvoice.id === billId) {
      setSelectedBillForInvoice(prev => prev ? { 
        ...prev, 
        paymentStatus: status,
        paidAmount: status === 'paid' ? prev.grandTotal : (status === 'unpaid' ? 0 : prev.paidAmount),
        remainingBalance: status === 'paid' ? 0 : (status === 'unpaid' ? prev.grandTotal : prev.remainingBalance),
      } : null);
    }
  };

  const handleUpdateBillPayment = (
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
  ) => {
    setBills(prev => prev.map(b => {
      if (b.id !== billId) return b;
      return {
        ...b,
        ...paymentData,
      };
    }));

    if (selectedBillForInvoice && selectedBillForInvoice.id === billId) {
      setSelectedBillForInvoice(prev => prev ? { ...prev, ...paymentData } : null);
    }
  };

  const handleUpdateBillContract = (billId: string, contract: LeaseContract) => {
    setBills(prev => prev.map(b => {
      if (b.id !== billId) return b;
      return {
        ...b,
        attachedContract: contract,
      };
    }));

    if (selectedBillForInvoice && selectedBillForInvoice.id === billId) {
      setSelectedBillForInvoice(prev => prev ? { ...prev, attachedContract: contract } : null);
    }
  };

  const handleOpenInvoiceModal = (bill: UtilityBill) => {
    setSelectedBillForInvoice(bill);
    setIsInvoiceModalOpen(true);
  };

  // Handlers for Bookings & Tenants
  const handleAddBooking = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    
    // If it's a monthly booking, also register tenant and set room occupied
    if (newBooking.rentalType === 'monthly') {
      const newTenant: Tenant = {
        id: `t-${Date.now()}`,
        name: newBooking.guestName,
        phone: newBooking.phone,
        email: newBooking.email,
        idCard: '1-1002-XXXXX-XX-X',
        roomNumber: newBooking.roomNumber,
        roomId: newBooking.roomId,
        rentalType: 'monthly',
        startDate: newBooking.checkInDate,
        endDate: newBooking.checkOutDate,
        depositAmount: newBooking.deposit,
        monthlyRent: newBooking.roomRateTotal,
        emergencyContact: 'ติดต่อฉุกเฉิน',
        emergencyPhone: newBooking.phone,
        status: 'active',
      };
      setTenants(prev => [newTenant, ...prev]);
      handleUpdateRoomStatus(newBooking.roomId, 'occupied');
      // Update room currentTenant object
      setRooms(prev => prev.map(r => r.id === newBooking.roomId ? {
        ...r,
        status: 'occupied',
        currentTenant: {
          id: newTenant.id,
          name: newTenant.name,
          phone: newTenant.phone,
          rentalType: 'monthly',
          startDate: newTenant.startDate,
        }
      } : r));
    } else {
      // Daily booking: mark reserved
      handleUpdateRoomStatus(newBooking.roomId, 'reserved');
    }
  };

  const handleDeleteBooking = (bookingId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
  };

  const handleClearBookings = (mode: 'all' | 'paid_cancelled') => {
    if (mode === 'all') {
      setBookings([]);
    } else {
      setBookings(prev => prev.filter(b => b.paymentStatus === 'pending'));
    }
  };

  const handleDeleteTenant = (tenantId: string, roomId: string) => {
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    setRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      status: 'available',
      currentTenant: undefined,
    } : r));
  };

  const handleCheckOutTenant = (tenantId: string, roomId: string) => {
    setTenants(prev => prev.filter(t => t.id !== tenantId));
    setRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      status: 'cleaning',
      currentTenant: undefined,
    } : r));
  };

  const handleUpdateBookingStatus = (bookingId: string, status: 'paid' | 'pending' | 'cancelled') => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, paymentStatus: status } : b));
  };

  const pendingBillsCount = bills.filter(b => b.paymentStatus === 'unpaid').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Prompt',sans-serif]">
      {/* Top Main Navigation */}
      <Navbar
        currentMode={currentMode}
        onToggleMode={setCurrentMode}
        adminTab={adminTab}
        onSelectAdminTab={setAdminTab}
        property={property}
        pendingBillsCount={pendingBillsCount}
      />

      {/* Main Container Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentMode === 'client' ? (
          <ClientBookingView
            rooms={rooms}
            bookings={bookings}
            property={property}
            onCompleteBooking={handleAddBooking}
          />
        ) : (
          <div>
            {adminTab === 'dashboard' && (
              <AdminDashboard
                rooms={rooms}
                bookings={bookings}
                bills={bills}
                property={property}
                onNavigateTab={setAdminTab}
                onSelectRoom={(room) => {
                  setAdminTab('rooms');
                }}
                onOpenInvoiceModal={handleOpenInvoiceModal}
                onNewBookingClick={() => setAdminTab('bookings')}
              />
            )}

            {adminTab === 'rooms' && (
              <RoomManagement
                rooms={rooms}
                onUpdateRoomStatus={handleUpdateRoomStatus}
                onUpdateRoom={handleUpdateRoom}
                onAddRoom={handleAddRoom}
                onDeleteRoom={handleDeleteRoom}
                onSelectRoomForBill={(room) => {
                  setAdminTab('utilities');
                }}
                bills={bills}
                property={property}
                onOpenInvoiceModal={handleOpenInvoiceModal}
                onUpdateBillStatus={handleUpdateBillStatus}
                onDeleteBill={handleDeleteBill}
              />
            )}

            {adminTab === 'utilities' && (
              <UtilityCalculator
                rooms={rooms}
                utilityConfig={utilityConfig}
                onUpdateUtilityConfig={setUtilityConfig}
                onUpdateRoomMeters={handleUpdateRoomMeters}
                onGenerateBill={handleGenerateBill}
                onDeleteBill={handleDeleteBill}
                onOpenInvoiceModal={handleOpenInvoiceModal}
                onUpdateBillStatus={handleUpdateBillStatus}
                existingBills={bills}
                property={property}
              />
            )}

            {adminTab === 'bookings' && (
              <BookingTenantList
                bookings={bookings}
                tenants={tenants}
                rooms={rooms}
                property={property}
                bills={bills}
                onAddBooking={handleAddBooking}
                onCheckOutTenant={handleCheckOutTenant}
                onDeleteTenant={handleDeleteTenant}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onDeleteBooking={handleDeleteBooking}
                onClearBookings={handleClearBookings}
                onOpenInvoiceModal={handleOpenInvoiceModal}
                onUpdateBillContract={handleUpdateBillContract}
              />
            )}

            {adminTab === 'settings' && (
              <AdminSettings
                property={property}
                utilityConfig={utilityConfig}
                onUpdateProperty={setProperty}
                onUpdateUtilityConfig={setUtilityConfig}
                onClearBookings={() => handleClearBookings('all')}
                onClearBills={handleClearBills}
                onResetMeters={handleResetMeters}
                onResetDemoData={handleResetDemoData}
              />
            )}
          </div>
        )}
      </main>

      {/* Official Invoice & Receipt Modal */}
      <InvoiceModal
        bill={selectedBillForInvoice}
        property={property}
        bills={bills}
        rooms={rooms}
        tenants={tenants}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedBillForInvoice(null);
        }}
        onUpdateStatus={handleUpdateBillStatus}
        onUpdateBillPayment={handleUpdateBillPayment}
        onUpdateBillContract={handleUpdateBillContract}
      />

      {/* Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {property.name} © 2026 • ระบบบริหารห้องพักรายวัน-รายเดือน & คิดค่าน้ำค่าไฟอัตโนมัติ
          </span>
          <span className="text-slate-400">
            โหมดปัจจุบัน: {currentMode === 'admin' ? '🛡️ แอดมินหลังบ้าน' : '🛎️ จองห้องพักสำหรับลูกค้า'}
          </span>
        </div>
      </footer>
    </div>
  );
}
