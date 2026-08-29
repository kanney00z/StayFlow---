import React, { useState, useEffect, useRef } from 'react';
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

import {
  getSupabase,
  broadcastRealtimeChange,
  fetchAllFromSupabase,
  isSupabaseConfigured,
  CLIENT_SESSION_ID,
  RealtimeSyncPayload
} from './lib/supabase';

export default function App() {
  // Mode: Admin vs Client
  const [currentMode, setCurrentMode] = useState<'admin' | 'client'>('admin');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'rooms' | 'utilities' | 'bookings' | 'settings'>('dashboard');

  // Supabase Real-Time State
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const isInitialCloudFetched = useRef(false);

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

  // Real-time Initialization and Cloud Hydration
  useEffect(() => {
    // Fetch initial data from Supabase Cloud if configured
    if (isSupabaseConfigured() && !isInitialCloudFetched.current) {
      isInitialCloudFetched.current = true;
      fetchAllFromSupabase().then((cloudData) => {
        if (cloudData) {
          if (cloudData.property) setProperty(cloudData.property);
          if (cloudData.utilityConfig) setUtilityConfig(cloudData.utilityConfig);
          if (cloudData.rooms && cloudData.rooms.length > 0) setRooms(cloudData.rooms);
          if (cloudData.tenants && cloudData.tenants.length > 0) setTenants(cloudData.tenants);
          if (cloudData.bookings && cloudData.bookings.length > 0) setBookings(cloudData.bookings);
          if (cloudData.bills && cloudData.bills.length > 0) setBills(cloudData.bills);
        }
      }).catch(err => {
        console.warn('Initial cloud sync check:', err);
      });
    }

    // Subscribe to Supabase Real-Time Broadcast Channel
    const supabase = getSupabase();
    if (supabase) {
      const channel = supabase.channel('stayflow_live_sync', {
        config: {
          broadcast: { self: false },
        },
      });

      channel
        .on('broadcast', { event: 'STATE_CHANGED' }, ({ payload }: { payload: RealtimeSyncPayload }) => {
          if (!payload || payload.senderId === CLIENT_SESSION_ID) return;
          
          if (payload.action === 'ROOMS_UPDATE' && Array.isArray(payload.data)) {
            setRooms(payload.data);
          } else if (payload.action === 'BILLS_UPDATE' && Array.isArray(payload.data)) {
            setBills(payload.data);
          } else if (payload.action === 'BOOKINGS_UPDATE' && Array.isArray(payload.data)) {
            setBookings(payload.data);
          } else if (payload.action === 'TENANTS_UPDATE' && Array.isArray(payload.data)) {
            setTenants(payload.data);
          } else if (payload.action === 'PROPERTY_UPDATE' && payload.data) {
            setProperty(payload.data);
          } else if (payload.action === 'CONFIG_UPDATE' && payload.data) {
            setUtilityConfig(payload.data);
          } else if (payload.action === 'FULL_SYNC' && payload.data) {
            if (payload.data.rooms) setRooms(payload.data.rooms);
            if (payload.data.bills) setBills(payload.data.bills);
            if (payload.data.bookings) setBookings(payload.data.bookings);
            if (payload.data.tenants) setTenants(payload.data.tenants);
            if (payload.data.property) setProperty(payload.data.property);
            if (payload.data.utilityConfig) setUtilityConfig(payload.data.utilityConfig);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsRealtimeConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsRealtimeConnected(false);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Helper to broadcast changes to other devices
  const notifyRealtimeChange = (action: RealtimeSyncPayload['action'], data: any) => {
    const supabase = getSupabase();
    if (supabase) {
      broadcastRealtimeChange(supabase, 'stayflow_live_sync', action, data);
    }
  };

  // Handlers for Room updates
  const handleUpdateRoomStatus = (roomId: string, newStatus: RoomStatus) => {
    setRooms(prev => {
      const updated = prev.map(r => r.id === roomId ? { ...r, status: newStatus } : r);
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      return updated;
    });
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms(prev => {
      const updated = prev.map(r => r.id === updatedRoom.id ? updatedRoom : r);
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      return updated;
    });
  };

  const handleAddRoom = (newRoom: Room) => {
    setRooms(prev => {
      const updated = [newRoom, ...prev];
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      return updated;
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms(prev => {
      const updatedRooms = prev.filter(r => r.id !== roomId);
      notifyRealtimeChange('ROOMS_UPDATE', updatedRooms);
      return updatedRooms;
    });
    setTenants(prev => {
      const updatedTenants = prev.filter(t => t.roomId !== roomId);
      notifyRealtimeChange('TENANTS_UPDATE', updatedTenants);
      return updatedTenants;
    });
    setBills(prev => {
      const updatedBills = prev.filter(b => b.roomId !== roomId);
      notifyRealtimeChange('BILLS_UPDATE', updatedBills);
      return updatedBills;
    });
  };

  // Handlers for Meter update
  const handleUpdateRoomMeters = (roomId: string, newWater: number, newElec: number) => {
    setRooms(prev => {
      const updated = prev.map(r => {
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
      });
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      return updated;
    });
  };

  // Handlers for Bills
  const handleGenerateBill = (newBill: UtilityBill) => {
    setBills(prev => {
      const existingIdx = prev.findIndex(b => b.id === newBill.id);
      let updated: UtilityBill[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = newBill;
      } else {
        updated = [newBill, ...prev];
      }
      notifyRealtimeChange('BILLS_UPDATE', updated);
      return updated;
    });
  };

  const handleDeleteBill = (billId: string) => {
    setBills(prev => {
      const updated = prev.filter(b => b.id !== billId);
      notifyRealtimeChange('BILLS_UPDATE', updated);
      return updated;
    });
  };

  const handleClearBills = () => {
    setBills([]);
    notifyRealtimeChange('BILLS_UPDATE', []);
  };

  const handleResetMeters = () => {
    setRooms(prev => {
      const updated = prev.map(r => ({
        ...r,
        previousWaterMeter: 0,
        currentWaterMeter: 0,
        previousElecMeter: 0,
        currentElecMeter: 0,
      }));
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      return updated;
    });
  };

  const handleResetDemoData = () => {
    setProperty(INITIAL_PROPERTY_PROFILE);
    setUtilityConfig(INITIAL_UTILITY_CONFIG);
    setRooms(INITIAL_ROOMS);
    setTenants(INITIAL_TENANTS);
    setBookings(INITIAL_BOOKINGS);
    setBills(INITIAL_BILLS);
    notifyRealtimeChange('FULL_SYNC', {
      property: INITIAL_PROPERTY_PROFILE,
      utilityConfig: INITIAL_UTILITY_CONFIG,
      rooms: INITIAL_ROOMS,
      tenants: INITIAL_TENANTS,
      bookings: INITIAL_BOOKINGS,
      bills: INITIAL_BILLS,
    });
  };

  const handleUpdateBillStatus = (billId: string, status: 'paid' | 'unpaid' | 'partial') => {
    setBills(prev => {
      const updated = prev.map(b => b.id === billId ? { 
        ...b, 
        paymentStatus: status,
        paidAmount: status === 'paid' ? b.grandTotal : (status === 'unpaid' ? 0 : b.paidAmount),
        remainingBalance: status === 'paid' ? 0 : (status === 'unpaid' ? b.grandTotal : b.remainingBalance),
        paidDate: status === 'paid' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined 
      } : b);
      notifyRealtimeChange('BILLS_UPDATE', updated);
      return updated;
    });

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
    setBills(prev => {
      const updated = prev.map(b => {
        if (b.id !== billId) return b;
        return {
          ...b,
          ...paymentData,
        };
      });
      notifyRealtimeChange('BILLS_UPDATE', updated);
      return updated;
    });

    if (selectedBillForInvoice && selectedBillForInvoice.id === billId) {
      setSelectedBillForInvoice(prev => prev ? { ...prev, ...paymentData } : null);
    }
  };

  const handleUpdateBillContract = (billId: string, contract: LeaseContract) => {
    setBills(prev => {
      const updated = prev.map(b => {
        if (b.id !== billId) return b;
        return {
          ...b,
          attachedContract: contract,
        };
      });
      notifyRealtimeChange('BILLS_UPDATE', updated);
      return updated;
    });

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
    setBookings(prev => {
      const updatedBookings = [newBooking, ...prev];
      notifyRealtimeChange('BOOKINGS_UPDATE', updatedBookings);
      return updatedBookings;
    });
    
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
      setTenants(prev => {
        const updatedTenants = [newTenant, ...prev];
        notifyRealtimeChange('TENANTS_UPDATE', updatedTenants);
        return updatedTenants;
      });
      handleUpdateRoomStatus(newBooking.roomId, 'occupied');
      // Update room currentTenant object
      setRooms(prev => {
        const updated = prev.map(r => r.id === newBooking.roomId ? {
          ...r,
          status: 'occupied' as RoomStatus,
          currentTenant: {
            id: newTenant.id,
            name: newTenant.name,
            phone: newTenant.phone,
            rentalType: 'monthly' as const,
            startDate: newTenant.startDate,
          }
        } : r);
        notifyRealtimeChange('ROOMS_UPDATE', updated);
        return updated;
      });
    } else {
      // Daily booking: mark reserved
      handleUpdateRoomStatus(newBooking.roomId, 'reserved');
    }
  };

  const handleDeleteBooking = (bookingId: string) => {
    setBookings(prev => {
      const updated = prev.filter(b => b.id !== bookingId);
      notifyRealtimeChange('BOOKINGS_UPDATE', updated);
      return updated;
    });
  };

  const handleClearBookings = (mode: 'all' | 'paid_cancelled') => {
    setBookings(prev => {
      let updated: Booking[];
      if (mode === 'all') {
        updated = [];
      } else {
        updated = prev.filter(b => b.paymentStatus === 'pending');
      }
      notifyRealtimeChange('BOOKINGS_UPDATE', updated);
      return updated;
    });
  };

  const handleDeleteTenant = (tenantId: string, roomId: string) => {
    setTenants(prev => {
      const updated = prev.filter(t => t.id !== tenantId);
      notifyRealtimeChange('TENANTS_UPDATE', updated);
      return updated;
    });
    setRooms(prev => {
      const updated = prev.map(r => r.id === roomId ? {
        ...r,
        status: 'available' as RoomStatus,
        currentTenant: undefined,
      } : r);
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      return updated;
    });
  };

  const handleCheckOutTenant = (tenantId: string, roomId: string) => {
    setTenants(prev => {
      const updated = prev.filter(t => t.id !== tenantId);
      notifyRealtimeChange('TENANTS_UPDATE', updated);
      return updated;
    });
    setRooms(prev => {
      const updated = prev.map(r => r.id === roomId ? {
        ...r,
        status: 'cleaning' as RoomStatus,
        currentTenant: undefined,
      } : r);
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      return updated;
    });
  };

  const handleUpdateBookingStatus = (bookingId: string, status: 'paid' | 'pending' | 'cancelled') => {
    setBookings(prev => {
      const updated = prev.map(b => b.id === bookingId ? { ...b, paymentStatus: status } : b);
      notifyRealtimeChange('BOOKINGS_UPDATE', updated);
      return updated;
    });
  };

  const handleCloudDataSynced = (data: {
    property?: PropertyProfile;
    utilityConfig?: UtilityRateConfig;
    rooms?: Room[];
    tenants?: Tenant[];
    bookings?: Booking[];
    bills?: UtilityBill[];
  }) => {
    if (data.property) setProperty(data.property);
    if (data.utilityConfig) setUtilityConfig(data.utilityConfig);
    if (data.rooms) setRooms(data.rooms);
    if (data.tenants) setTenants(data.tenants);
    if (data.bookings) setBookings(data.bookings);
    if (data.bills) setBills(data.bills);
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
        isRealtimeConnected={isRealtimeConnected}
        isSupabaseConfigured={isSupabaseConfigured()}
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
                onUpdateUtilityConfig={(cfg) => {
                  setUtilityConfig(cfg);
                  notifyRealtimeChange('CONFIG_UPDATE', cfg);
                }}
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
                rooms={rooms}
                tenants={tenants}
                bookings={bookings}
                bills={bills}
                onUpdateProperty={(prop) => {
                  setProperty(prop);
                  notifyRealtimeChange('PROPERTY_UPDATE', prop);
                }}
                onUpdateUtilityConfig={(cfg) => {
                  setUtilityConfig(cfg);
                  notifyRealtimeChange('CONFIG_UPDATE', cfg);
                }}
                onClearBookings={() => handleClearBookings('all')}
                onClearBills={handleClearBills}
                onResetMeters={handleResetMeters}
                onResetDemoData={handleResetDemoData}
                onDataSyncedFromCloud={handleCloudDataSynced}
                isRealtimeConnected={isRealtimeConnected}
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
