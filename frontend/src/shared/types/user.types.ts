// shared/types/user.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the User / Profile shape.
// Used by Admin (review), Supervisor (team view), and Promoter (own profile).
//
// RECONCILED: merges the roles-based User fields (id, name, email, role) with
// the promoter-specific profile fields (fullName, reliabilityScore, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import type { Role } from '../constants/roles';

export type OnboardingStatus =
  | 'incomplete'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'blacklisted';

export interface PhysicalAttributes {
  height: number;        // centimetres
  clothingSize: string;  // XS / S / M / L / XL
  shoeSize?: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountType: string;   // Cheque | Savings | Transmission
  branchCode: string;
}

export interface DocumentVault {
  idFront?: string;          // file URL or mock:// placeholder
  idBack?: string;
  taxNumber?: string;
  bankConfirmation?: string;
  cv?: string;
  profilePhotos: string[];   // max 3
}

// ─── Full promoter profile ────────────────────────────────────────────────────
// `id` and `name` align with the auth User shape.
// `fullName` is the legal name as on their SA ID (separate from display name).
export interface UserProfile {
  // ── Auth / identity fields ──────────────────────────────────────────────────
  userId: string;          // matches User.id from AuthContext
  id?: string;             // alias kept for backwards compatibility
  name?: string;           // display name (optional, used by supervisor/admin views)
  email?: string;
  phone?: string;
  role?: Role;

  // ── Legal identity ──────────────────────────────────────────────────────────
  fullName: string;        // as per SA ID document
  idNumber: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';

  // ── Contact & location ──────────────────────────────────────────────────────
  address: string;
  city: string;
  province: string;
  coordinates?: { lat: number; lng: number };

  // ── Profile media ───────────────────────────────────────────────────────────
  profilePhoto?: string;   // URL or base64
  avatarUrl?: string;      // alias for profilePhoto used by some views

  // ── Attributes ──────────────────────────────────────────────────────────────
  physicalAttributes: PhysicalAttributes;
  socialMedia?: { instagram?: string; tiktok?: string };

  // ── Documents & banking ─────────────────────────────────────────────────────
  documents: DocumentVault;
  bankDetails?: BankDetails;

  // ── Onboarding & scoring ────────────────────────────────────────────────────
  onboardingStatus: OnboardingStatus;
  rejectionReason?: string;  // set by Admin on rejection
  reliabilityScore: number;  // 0–5, updated by supervisor ratings

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
}

// ─── Lightweight team view (used by Supervisor) ───────────────────────────────
export interface TeamMember {
  userId: string;
  fullName: string;
  profilePhoto?: string;
  reliabilityScore: number;
  onboardingStatus: OnboardingStatus;
  businessId?: string;
  jobsAssigned?: number;
}