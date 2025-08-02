export interface Treatment {
  id: string;
  date: string;
  time: string;
  observations: string;
  remedy?: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  avatarUrl: string;
  patientNumber?: string;
  contactNumber?: string;
  treatments: Treatment[];
}
