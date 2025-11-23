
export type Role = 'admin' | 'user';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  photo: string;
}

export type AttendanceType = 'حضور' | 'انصراف';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  type: AttendanceType;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  gps_lat: number;
  gps_lng: number;
  selfie?: string; // Base64 data URL
}

export type TaskPriority = 'routine' | 'urgent' | 'report';

export interface Task {
  id: string;
  title: string;
  assigned_to: string; // user_id
  is_completed: boolean;
  created_at: string;
  priority: TaskPriority;
  report_response?: string; // If the task requires a report
}

export type WorkerStatus = 'offline' | 'active' | 'break';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'urgent' | 'info' | 'digest';
  timestamp: string;
  isRead: boolean;
}

export interface AppSettings {
  location_lat: number;
  location_lng: number;
  radius: number; // in km
}

export interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}
