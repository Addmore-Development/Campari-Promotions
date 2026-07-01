export type JobStatus = 'draft' | 'open' | 'filled' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'allocated' | 'standby' | 'declined';

export interface JobFilters {
  gender?: 'male' | 'female' | 'any';
  minHeight?: number; // cm
  requiredAttributes?: string[];
}

export interface Job {
  id: string;
  title: string;
  client: string;
  brand: string;
  venue: string;
  address: string;
  coordinates: { lat: number; lng: number };
  date: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  totalSlots: number;
  filledSlots: number;
  filters: JobFilters;
  status: JobStatus;
  distanceKm?: number; // computed per promoter
  createdBy: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  promoterId: string;
  status: ApplicationStatus;
  appliedAt: string;
}