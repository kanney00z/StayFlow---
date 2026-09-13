import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RoomManagement } from './components/admin/RoomManagement';
import { UtilityCalculator } from './components/admin/UtilityCalculator';
import { BookingTenantList } from './components/admin/BookingTenantList';
import { AdminSettings } from './components/admin/AdminSettings';
import { InvoiceModal } from './components/admin/InvoiceModal';
import { ClientBookingView } from './components/client/ClientBookingView';
import { CheckCircle2, Cloud, RefreshCw, X } from 'lucide-react';

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

import { safeStorage } from './lib/storage';
import { 
  fetchServerState, 
  saveServerState, 
  deleteBookingFromServer,
  clearBookingsFromServer,
  deleteTenantFromServer,
  deleteBillFromServer,
  ServerSyncData 
} from './lib/serverSync';

import {
  getSupabase,
  broadcastRealtimeChange,
  fetchAllFromSupabase,
  syncAllToSupabase,
  savePropertyToCloud,
  saveUtilityConfigToCloud,
  saveTenantsToCloud,
  saveRoomsToCloud,
  saveBookingsToCloud,
  saveBillsToCloud,
  deleteBookingFromCloud,
  clearBookingsFromCloud,
  deleteTenantFromCloud,
  deleteBillFromCloud,
  clearBillsFromCloud,
  deleteRoomFromCloud,
  isSupabaseConfigured,
  parseAndApplySyncFromUrl,
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
    return safeStorage.getItem('stayflow_property', INITIAL_PROPERTY_PROFILE);
  });

  const [utilityConfig, setUtilityConfig] = useState<UtilityRateConfig>(() => {
    return safeStorage.getItem('stayflow_utility_config', INITIAL_UTILITY_CONFIG);
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const parsed: Room[] = safeStorage.getItem('stayflow_rooms', INITIAL_ROOMS);
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
    return safeStorage.getItem('stayflow_tenants', INITIAL_TENANTS);
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    return safeStorage.getItem('stayflow_bookings', INITIAL_BOOKINGS);
  });

  const [bills, setBills] = useState<UtilityBill[]>(() => {
    return safeStorage.getItem('stayflow_bills', INITIAL_BILLS);
  });

  // Active Invoice Modal state
  const [selectedBillForInvoice, setSelectedBillForInvoice] = useState<UtilityBill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [isFetchingCloud, setIsFetchingCloud] = useState<boolean>(false);

  // Auto-detect Sync from URL on mount
  useEffect(() => {
    const applied = parseAndApplySyncFromUrl();
    if (applied) {
      setSyncToastMessage('📱 ซิงค์ข้อมูลจากคอมพิวเตอร์สำเร็จ! เชื่อมต่อฐานข้อมูล Cloud เรียบร้อยแล้ว');
      setTimeout(() => setSyncToastMessage(null), 6000);
      
      // Force refresh data from cloud
      setIsFetchingCloud(true);
      fetchAllFromSupabase().then((cloudData) => {
        if (cloudData) {
          if (cloudData.property) setProperty(cloudData.property);
          if (cloudData.utilityConfig) setUtilityConfig(cloudData.utilityConfig);
          if (cloudData.rooms && cloudData.rooms.length > 0) setRooms(cloudData.rooms);
          if (cloudData.tenants && cloudData.tenants.length > 0) setTenants(cloudData.tenants);
          if (cloudData.bookings && cloudData.bookings.length > 0) setBookings(cloudData.bookings);
          if (cloudData.bills && cloudData.bills.length > 0) setBills(cloudData.bills);
        }
      }).finally(() => {
        setIsFetchingCloud(false);
      });
    }
  }, []);

  // Sync with LocalStorage (Using safeStorage to avoid QuotaExceededError crashes on mobile browsers)
  useEffect(() => {
    safeStorage.setItem('stayflow_property', property);
  }, [property]);

  useEffect(() => {
    safeStorage.setItem('stayflow_utility_config', utilityConfig);
  }, [utilityConfig]);

  useEffect(() => {
    safeStorage.setItem('stayflow_rooms', rooms);
  }, [rooms]);

  useEffect(() => {
    safeStorage.setItem('stayflow_tenants', tenants);
  }, [tenants]);

  useEffect(() => {
    safeStorage.setItem('stayflow_bookings', bookings);
  }, [bookings]);

  useEffect(() => {
    safeStorage.setItem('stayflow_bills', bills);
  }, [bills]);

  // Last server state update timestamp to avoid re-applying our own changes
  const lastLocalSaveTimestamp = useRef<number>(0);
  const isServerSyncActive = useRef<boolean>(false);

  // Real-time Initialization and Cloud / Server Hydration
  useEffect(() => {
    let isMounted = true;

    async function initDataHydration() {
      let cloudSuccess = false;

      // 1. Try fetching from Supabase Cloud if configured
      if (isSupabaseConfigured() && !isInitialCloudFetched.current) {
        isInitialCloudFetched.current = true;
        try {
          const cloudData = await fetchAllFromSupabase();
          if (cloudData && isMounted) {
            const hasRooms = Array.isArray(cloudData.rooms) && cloudData.rooms.length > 0;
            const hasTenants = Array.isArray(cloudData.tenants) && cloudData.tenants.length > 0;
            
            if (cloudData.property && cloudData.property.name) {
              setProperty(cloudData.property);
              safeStorage.setItem('stayflow_property', cloudData.property);
            }

            if (cloudData.utilityConfig) {
              setUtilityConfig(cloudData.utilityConfig);
              safeStorage.setItem('stayflow_utility_config', cloudData.utilityConfig);
            }

            if (hasRooms) {
              setRooms(cloudData.rooms!);
              safeStorage.setItem('stayflow_rooms', cloudData.rooms!);
            }

            if (hasTenants) {
              setTenants(cloudData.tenants!);
              safeStorage.setItem('stayflow_tenants', cloudData.tenants!);
            }

            if (Array.isArray(cloudData.bookings)) {
              setBookings(cloudData.bookings);
              safeStorage.setItem('stayflow_bookings', cloudData.bookings);
            }

            if (Array.isArray(cloudData.bills)) {
              setBills(cloudData.bills);
              safeStorage.setItem('stayflow_bills', cloudData.bills);
            }

            cloudSuccess = Boolean(hasRooms || hasTenants || cloudData.property);
            if (cloudSuccess) {
              lastLocalSaveTimestamp.current = Date.now();
            }
          }
        } catch (err) {
          console.warn('Initial Supabase sync error (will fallback to server sync):', err);
        }
      }

      // 2. Server-side State Hydration (Reliable fallback if Supabase quota is exceeded or offline)
      try {
        const serverData = await fetchServerState();
        if (serverData && isMounted) {
          if (!cloudSuccess) {
            // Apply server state if cloud was not populated or quota restricted
            if (serverData.property && serverData.property.name) {
              setProperty(serverData.property);
              safeStorage.setItem('stayflow_property', serverData.property);
            }
            if (serverData.utilityConfig) {
              setUtilityConfig(serverData.utilityConfig);
              safeStorage.setItem('stayflow_utility_config', serverData.utilityConfig);
            }
            if (Array.isArray(serverData.rooms) && serverData.rooms.length > 0) {
              setRooms(serverData.rooms);
              safeStorage.setItem('stayflow_rooms', serverData.rooms);
            }
            if (Array.isArray(serverData.tenants)) {
              setTenants(serverData.tenants);
              safeStorage.setItem('stayflow_tenants', serverData.tenants);
            }
            if (Array.isArray(serverData.bookings)) {
              setBookings(serverData.bookings);
              safeStorage.setItem('stayflow_bookings', serverData.bookings);
            }
            if (Array.isArray(serverData.bills)) {
              setBills(serverData.bills);
              safeStorage.setItem('stayflow_bills', serverData.bills);
            }
          }
          lastLocalSaveTimestamp.current = Math.max(Date.now(), serverData.updatedAt || 0);
        } else if (!serverData && isMounted) {
          // If server has no state yet, seed current local state to server
          lastLocalSaveTimestamp.current = Date.now();
          saveServerState({
            property,
            utilityConfig,
            rooms,
            tenants,
            bookings,
            bills,
            updatedAt: lastLocalSaveTimestamp.current,
          });
        }
      } catch (serverErr) {
        console.warn('Server sync hydration check:', serverErr);
      }
    }

    initDataHydration();

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced auto-save to Server persistence layer
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = Date.now();
      lastLocalSaveTimestamp.current = now;
      saveServerState({
        property,
        utilityConfig,
        rooms,
        tenants,
        bookings,
        bills,
        updatedAt: now,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [property, utilityConfig, rooms, tenants, bookings, bills]);

  // Periodic polling for multi-device real-time sync via Server API
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const sData = await fetchServerState();
        if (sData && sData.updatedAt && sData.updatedAt > (lastLocalSaveTimestamp.current + 500)) {
          lastLocalSaveTimestamp.current = sData.updatedAt;
          if (Array.isArray(sData.rooms)) {
            setRooms(sData.rooms);
            safeStorage.setItem('stayflow_rooms', sData.rooms);
          }
          if (Array.isArray(sData.tenants)) {
            setTenants(sData.tenants);
            safeStorage.setItem('stayflow_tenants', sData.tenants);
          }
          if (Array.isArray(sData.bills)) {
            setBills(sData.bills);
            safeStorage.setItem('stayflow_bills', sData.bills);
          }
          if (Array.isArray(sData.bookings)) {
            setBookings(sData.bookings);
            safeStorage.setItem('stayflow_bookings', sData.bookings);
          }
          if (sData.property) {
            setProperty(sData.property);
            safeStorage.setItem('stayflow_property', sData.property);
          }
          if (sData.utilityConfig) {
            setUtilityConfig(sData.utilityConfig);
            safeStorage.setItem('stayflow_utility_config', sData.utilityConfig);
          }
        }
      } catch {
        // Silent
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Supabase Real-Time Broadcast & Postgres Changes Channels (if configured)
  useEffect(() => {
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
            safeStorage.setItem('stayflow_rooms', payload.data);
          } else if (payload.action === 'BILLS_UPDATE' && Array.isArray(payload.data)) {
            setBills(payload.data);
            safeStorage.setItem('stayflow_bills', payload.data);
          } else if (payload.action === 'BOOKINGS_UPDATE' && Array.isArray(payload.data)) {
            setBookings(payload.data);
            safeStorage.setItem('stayflow_bookings', payload.data);
          } else if (payload.action === 'TENANTS_UPDATE' && Array.isArray(payload.data)) {
            setTenants(payload.data);
            safeStorage.setItem('stayflow_tenants', payload.data);
          } else if (payload.action === 'PROPERTY_UPDATE' && payload.data) {
            setProperty(payload.data);
            safeStorage.setItem('stayflow_property', payload.data);
          } else if (payload.action === 'CONFIG_UPDATE' && payload.data) {
            setUtilityConfig(payload.data);
            safeStorage.setItem('stayflow_utility_config', payload.data);
          } else if (payload.action === 'FULL_SYNC' && payload.data) {
            if (payload.data.rooms) { setRooms(payload.data.rooms); safeStorage.setItem('stayflow_rooms', payload.data.rooms); }
            if (payload.data.bills) { setBills(payload.data.bills); safeStorage.setItem('stayflow_bills', payload.data.bills); }
            if (payload.data.bookings) { setBookings(payload.data.bookings); safeStorage.setItem('stayflow_bookings', payload.data.bookings); }
            if (payload.data.tenants) { setTenants(payload.data.tenants); safeStorage.setItem('stayflow_tenants', payload.data.tenants); }
            if (payload.data.property) { setProperty(payload.data.property); safeStorage.setItem('stayflow_property', payload.data.property); }
            if (payload.data.utilityConfig) { setUtilityConfig(payload.data.utilityConfig); safeStorage.setItem('stayflow_utility_config', payload.data.utilityConfig); }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'utility_config' }, (payload: any) => {
          if (payload.new) {
            const c = payload.new;
            const updated: UtilityRateConfig = {
              waterRatePerUnit: Number(c.water_rate ?? c.water_rate_per_unit ?? 18),
              waterBillingType: c.water_calculation_type || c.water_billing_type || 'unit',
              waterFlatRate: Number(c.water_flat_rate ?? 100),
              waterPerPersonRate: Number(c.water_per_person_rate ?? 100),
              elecRatePerUnit: Number(c.elec_rate ?? c.elec_rate_per_unit ?? 8),
              commonFeeMonthly: Number(c.common_fee ?? c.common_fee_monthly ?? 300),
              internetFeeMonthly: Number(c.internet_fee ?? c.internet_fee_monthly ?? 200),
              trashFeeMonthly: Number(c.trash_fee ?? c.trash_fee_monthly ?? 40),
              parkingFeeMonthly: Number(c.parking_fee ?? c.parking_fee_monthly ?? 300),
              minWaterCharge: Number(c.min_water_charge ?? 0),
              minElecCharge: Number(c.min_elec_charge ?? 0),
            };
            setUtilityConfig(updated);
            safeStorage.setItem('stayflow_utility_config', updated);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'property_profile' }, (payload: any) => {
          if (payload.new) {
            const p = payload.new;
            const updated: PropertyProfile = {
              name: p.name || '',
              nameEn: p.name_en || '',
              tagline: p.notes || p.tagline || '',
              address: p.address || '',
              phone: p.phone || '',
              email: p.email || '',
              taxId: p.tax_id || '',
              bankName: p.bank_name || '',
              bankAccount: p.bank_account || '',
              bankAccountName: p.bank_account_name || '',
              promptPayId: p.prompt_pay_id || '',
              promptPayName: p.prompt_pay_name || '',
              lineId: p.line_id || '',
              wifiSsid: p.wifi_ssid || '',
              wifiPass: p.wifi_pass || '',
            };
            setProperty(updated);
            safeStorage.setItem('stayflow_property', updated);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
          fetchAllFromSupabase().then(cloudData => {
            if (cloudData?.rooms && cloudData.rooms.length > 0) {
              setRooms(cloudData.rooms);
              safeStorage.setItem('stayflow_rooms', cloudData.rooms);
            }
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
          fetchAllFromSupabase().then(cloudData => {
            if (cloudData?.tenants) {
              setTenants(cloudData.tenants);
              safeStorage.setItem('stayflow_tenants', cloudData.tenants);
            }
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          fetchAllFromSupabase().then(cloudData => {
            if (cloudData?.bookings) {
              setBookings(cloudData.bookings);
              safeStorage.setItem('stayflow_bookings', cloudData.bookings);
            }
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'utility_bills' }, () => {
          fetchAllFromSupabase().then(cloudData => {
            if (cloudData?.bills) {
              setBills(cloudData.bills);
              safeStorage.setItem('stayflow_bills', cloudData.bills);
            }
          });
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
      saveRoomsToCloud(updated);
      return updated;
    });
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms(prev => {
      const updated = prev.map(r => r.id === updatedRoom.id ? updatedRoom : r);
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      saveRoomsToCloud(updated);
      return updated;
    });
  };

  const handleAddRoom = (newRoom: Room) => {
    setRooms(prev => {
      const updated = [newRoom, ...prev];
      notifyRealtimeChange('ROOMS_UPDATE', updated);
      saveRoomsToCloud(updated);
      return updated;
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    const updatedRooms = rooms.filter(r => r.id !== roomId);
    const updatedTenants = tenants.filter(t => t.roomId !== roomId);
    const updatedBills = bills.filter(b => b.roomId !== roomId);

    const now = Date.now();
    lastLocalSaveTimestamp.current = now;

    setRooms(updatedRooms);
    setTenants(updatedTenants);
    setBills(updatedBills);

    safeStorage.setItem('stayflow_rooms', updatedRooms);
    safeStorage.setItem('stayflow_tenants', updatedTenants);
    safeStorage.setItem('stayflow_bills', updatedBills);

    saveServerState({
      property,
      utilityConfig,
      rooms: updatedRooms,
      tenants: updatedTenants,
      bookings,
      bills: updatedBills,
      updatedAt: now,
    });

    notifyRealtimeChange('ROOMS_UPDATE', updatedRooms);
    notifyRealtimeChange('TENANTS_UPDATE', updatedTenants);
    notifyRealtimeChange('BILLS_UPDATE', updatedBills);

    deleteRoomFromCloud(roomId);
    saveTenantsToCloud(updatedTenants);
    saveBillsToCloud(updatedBills);
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
      saveRoomsToCloud(updated);
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
      saveBillsToCloud(updated);
      return updated;
    });
  };

  const handleDeleteBill = (billId: string) => {
    const updated = bills.filter(b => b.id !== billId);
    const now = Date.now();
    lastLocalSaveTimestamp.current = now;

    setBills(updated);
    safeStorage.setItem('stayflow_bills', updated);

    saveServerState({
      property,
      utilityConfig,
      rooms,
      tenants,
      bookings,
      bills: updated,
      updatedAt: now,
    });
    deleteBillFromServer(billId);

    notifyRealtimeChange('BILLS_UPDATE', updated);
    deleteBillFromCloud(billId);
  };

  const handleClearBills = () => {
    const deletedIds = bills.map(b => b.id);
    const now = Date.now();
    lastLocalSaveTimestamp.current = now;

    setBills([]);
    safeStorage.setItem('stayflow_bills', []);

    saveServerState({
      property,
      utilityConfig,
      rooms,
      tenants,
      bookings,
      bills: [],
      updatedAt: now,
    });

    notifyRealtimeChange('BILLS_UPDATE', []);
    clearBillsFromCloud(deletedIds);
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
      saveRoomsToCloud(updated);
      return updated;
    });
  };

  const handleUpdateProperty = async (newProp: PropertyProfile) => {
    setProperty(newProp);
    safeStorage.setItem('stayflow_property', newProp);
    notifyRealtimeChange('PROPERTY_UPDATE', newProp);
    await savePropertyToCloud(newProp);
  };

  const handleUpdateUtilityConfig = async (newConfig: UtilityRateConfig) => {
    setUtilityConfig(newConfig);
    safeStorage.setItem('stayflow_utility_config', newConfig);
    notifyRealtimeChange('CONFIG_UPDATE', newConfig);
    await saveUtilityConfigToCloud(newConfig);
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
    syncAllToSupabase({
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
      saveBillsToCloud(updated);
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
      saveBillsToCloud(updated);
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
      saveBillsToCloud(updated);
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
      saveBookingsToCloud(updatedBookings);
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
        saveTenantsToCloud(updatedTenants);
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
        saveRoomsToCloud(updated);
        return updated;
      });
    } else {
      // Daily booking: mark reserved
      handleUpdateRoomStatus(newBooking.roomId, 'reserved');
    }
  };

  const handleDeleteBooking = (bookingId: string) => {
    const bookingToDelete = bookings.find(b => b.id === bookingId);
    const updated = bookings.filter(b => b.id !== bookingId);

    const now = Date.now();
    lastLocalSaveTimestamp.current = now;

    setBookings(updated);
    safeStorage.setItem('stayflow_bookings', updated);

    // If the room was reserved for this booking, release the reservation if no other active booking
    let updatedRooms = rooms;
    if (bookingToDelete?.roomId) {
      const remainingForRoom = updated.filter(b => b.roomId === bookingToDelete.roomId);
      if (remainingForRoom.length === 0) {
        const roomObj = rooms.find(r => r.id === bookingToDelete.roomId);
        if (roomObj && roomObj.status === 'reserved') {
          updatedRooms = rooms.map(r => r.id === bookingToDelete.roomId ? { ...r, status: 'available' as RoomStatus } : r);
          setRooms(updatedRooms);
          safeStorage.setItem('stayflow_rooms', updatedRooms);
          notifyRealtimeChange('ROOMS_UPDATE', updatedRooms);
          saveRoomsToCloud(updatedRooms);
        }
      }
    }

    // Save to server sync immediately
    saveServerState({
      property,
      utilityConfig,
      rooms: updatedRooms,
      tenants,
      bookings: updated,
      bills,
      updatedAt: now,
    });
    deleteBookingFromServer(bookingId);

    notifyRealtimeChange('BOOKINGS_UPDATE', updated);
    deleteBookingFromCloud(bookingId);
  };

  const handleClearBookings = (mode: 'all' | 'paid_cancelled') => {
    let updated: Booking[];
    let deletedIds: string[] = [];
    if (mode === 'all') {
      deletedIds = bookings.map(b => b.id);
      updated = [];
    } else {
      deletedIds = bookings.filter(b => b.paymentStatus !== 'pending').map(b => b.id);
      updated = bookings.filter(b => b.paymentStatus === 'pending');
    }

    const now = Date.now();
    lastLocalSaveTimestamp.current = now;

    setBookings(updated);
    safeStorage.setItem('stayflow_bookings', updated);

    saveServerState({
      property,
      utilityConfig,
      rooms,
      tenants,
      bookings: updated,
      bills,
      updatedAt: now,
    });
    clearBookingsFromServer(mode);

    notifyRealtimeChange('BOOKINGS_UPDATE', updated);
    clearBookingsFromCloud(deletedIds);
  };

  const handleDeleteTenant = (tenantId: string, roomId: string) => {
    const updatedTenants = tenants.filter(t => t.id !== tenantId);
    const updatedRooms = rooms.map(r => r.id === roomId ? {
      ...r,
      status: 'available' as RoomStatus,
      currentTenant: undefined,
    } : r);

    const now = Date.now();
    lastLocalSaveTimestamp.current = now;

    setTenants(updatedTenants);
    setRooms(updatedRooms);
    safeStorage.setItem('stayflow_tenants', updatedTenants);
    safeStorage.setItem('stayflow_rooms', updatedRooms);

    saveServerState({
      property,
      utilityConfig,
      rooms: updatedRooms,
      tenants: updatedTenants,
      bookings,
      bills,
      updatedAt: now,
    });
    deleteTenantFromServer(tenantId);

    notifyRealtimeChange('TENANTS_UPDATE', updatedTenants);
    notifyRealtimeChange('ROOMS_UPDATE', updatedRooms);

    deleteTenantFromCloud(tenantId);
    saveRoomsToCloud(updatedRooms);
  };

  const handleCheckOutTenant = (tenantId: string, roomId: string) => {
    const updatedTenants = tenants.filter(t => t.id !== tenantId);
    const updatedRooms = rooms.map(r => r.id === roomId ? {
      ...r,
      status: 'cleaning' as RoomStatus,
      currentTenant: undefined,
    } : r);

    const now = Date.now();
    lastLocalSaveTimestamp.current = now;

    setTenants(updatedTenants);
    setRooms(updatedRooms);
    safeStorage.setItem('stayflow_tenants', updatedTenants);
    safeStorage.setItem('stayflow_rooms', updatedRooms);

    saveServerState({
      property,
      utilityConfig,
      rooms: updatedRooms,
      tenants: updatedTenants,
      bookings,
      bills,
      updatedAt: now,
    });
    deleteTenantFromServer(tenantId);

    notifyRealtimeChange('TENANTS_UPDATE', updatedTenants);
    notifyRealtimeChange('ROOMS_UPDATE', updatedRooms);

    deleteTenantFromCloud(tenantId);
    saveRoomsToCloud(updatedRooms);
  };

  const handleUpdateBookingStatus = (bookingId: string, status: 'paid' | 'pending' | 'cancelled') => {
    setBookings(prev => {
      const updated = prev.map(b => b.id === bookingId ? { ...b, paymentStatus: status } : b);
      notifyRealtimeChange('BOOKINGS_UPDATE', updated);
      saveBookingsToCloud(updated);
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

      {/* Sync Status Toast Alert */}
      {syncToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white border border-emerald-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-emerald-300">การเชื่อมต่อเรียลไทม์</p>
            <p className="text-slate-200 mt-0.5">{syncToastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSyncToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                onUpdateUtilityConfig={handleUpdateUtilityConfig}
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
                onUpdateProperty={handleUpdateProperty}
                onUpdateUtilityConfig={handleUpdateUtilityConfig}
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
