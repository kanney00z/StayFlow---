import { Room, Tenant, Booking } from '../types';

export interface RoomOccupant {
  id: string;
  name: string;
  phone: string;
  rentalType: 'daily' | 'monthly';
  startDate?: string;
  endDate?: string;
  source: 'room_field' | 'tenant_table' | 'booking_table' | 'manual_occupied';
}

/**
 * Resolves the occupant/tenant for a given room by checking:
 * 1. room.currentTenant field
 * 2. tenants table (active tenants matching roomId or roomNumber)
 * 3. bookings table (active bookings matching roomId or roomNumber)
 * 4. Fallback if room.status === 'occupied'
 */
export function getRoomOccupant(
  room: Room,
  tenants: Tenant[] = [],
  bookings: Booking[] = []
): RoomOccupant | null {
  if (!room) return null;

  // 1. Direct currentTenant object on room
  if (room.currentTenant && typeof room.currentTenant.name === 'string' && room.currentTenant.name.trim() !== '') {
    return {
      id: room.currentTenant.id || `tenant-${room.id}`,
      name: room.currentTenant.name.trim(),
      phone: room.currentTenant.phone || '',
      rentalType: room.currentTenant.rentalType || 'monthly',
      startDate: room.currentTenant.startDate,
      source: 'room_field',
    };
  }

  // 2. Search in tenants table by roomId or roomNumber (status active)
  const activeTenant = tenants.find(
    t => (t.roomId === room.id || t.roomNumber === room.number) && t.status !== 'checked_out'
  );
  if (activeTenant && activeTenant.name && activeTenant.name.trim() !== '') {
    return {
      id: activeTenant.id,
      name: activeTenant.name.trim(),
      phone: activeTenant.phone || '',
      rentalType: activeTenant.rentalType || 'monthly',
      startDate: activeTenant.startDate,
      endDate: activeTenant.endDate,
      source: 'tenant_table',
    };
  }

  // 3. Search in bookings table (active bookings not cancelled)
  const activeBooking = bookings.find(
    b => (b.roomId === room.id || b.roomNumber === room.number) && b.paymentStatus !== 'cancelled'
  );
  if (activeBooking && activeBooking.guestName && activeBooking.guestName.trim() !== '') {
    return {
      id: activeBooking.id,
      name: activeBooking.guestName.trim(),
      phone: activeBooking.phone || '',
      rentalType: activeBooking.rentalType || 'daily',
      startDate: activeBooking.checkInDate,
      endDate: activeBooking.checkOutDate,
      source: 'booking_table',
    };
  }

  // 4. If status is 'occupied' but tenant details were not explicitly attached
  if (room.status === 'occupied') {
    return {
      id: `manual-tenant-${room.id}`,
      name: 'ผู้เช่าห้องพัก',
      phone: '',
      rentalType: 'monthly',
      source: 'manual_occupied',
    };
  }

  return null;
}

/**
 * Ensures all rooms have accurate occupancy status and currentTenant populated
 * based on tenants and bookings.
 */
export function reconcileRoomsWithOccupants(
  rooms: Room[],
  tenants: Tenant[] = [],
  bookings: Booking[] = []
): Room[] {
  if (!Array.isArray(rooms)) return [];

  return rooms.map(room => {
    const occupant = getRoomOccupant(room, tenants, bookings);
    if (occupant) {
      return {
        ...room,
        status: 'occupied',
        currentTenant: {
          id: occupant.id,
          name: occupant.name,
          phone: occupant.phone,
          rentalType: occupant.rentalType,
          startDate: occupant.startDate || new Date().toISOString().split('T')[0],
        }
      };
    }
    return room;
  });
}
