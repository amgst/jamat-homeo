export interface Treatment {
  id: string;
  date: string;
  time: string;
  observations: string;
  remedy?: string;
}

export interface Medicine {
  id: string;
  name: string;
  stock: number;
  unit: string;
  expiryDate?: string;
  batchNumber?: string;
  manufacturer?: string;
  price?: number;
  minStockLevel?: number;
}

export interface Patient {
  id: string;
  name: string;
  dob?: string;
  avatarUrl?: string;
  patientNumber?: string;
  contactNumber?: string;
  fatherName?: string;
  age?: number;
  sex?: 'Male' | 'Female' | 'Other';
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  treatments?: Treatment[];
}
