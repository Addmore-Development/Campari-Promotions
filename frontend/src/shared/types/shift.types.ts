export type ShiftStatus = 'scheduled' | 'checked_in' | 'active' | 'checked_out' | 'pending_approval' | 'approved' | 'no_show';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
}

export interface ShiftIssue {
  id: string;
  type: 'wrong_uniform' | 'behavior' | 'late' | 'other';
  note: string;
  loggedBy: string;
  loggedAt: string;
}

export interface AttendanceRecord {
  shiftId: string;
  promoterId: string;
  jobId: string;
  checkInTime?: string;
  checkInLocation?: GeoLocation;
  checkInSelfie?: string;
  checkOutTime?: string;
  checkOutLocation?: GeoLocation;
  checkOutSelfie?: string;
  totalHours?: number;
  issues: ShiftIssue[];
  supervisorRating?: number; // 1-5
  status: ShiftStatus;
}

export interface Shift {
  id: string;
  jobId: string;
  promoterId: string;
  attendance: AttendanceRecord;
  grossPay?: number;
  deductions?: number;
  netPay?: number;
  status: ShiftStatus;
}