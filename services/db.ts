
import { User, AttendanceRecord, AppSettings, Task, WorkerStatus, AppNotification } from '../types';
import { INITIAL_USERS, INITIAL_SETTINGS, INITIAL_TASKS } from '../constants';

const KEYS = {
  USERS: 'dawam_users',
  ATTENDANCE: 'dawam_attendance',
  SETTINGS: 'dawam_settings',
  CURRENT_USER: 'dawam_current_user',
  TASKS: 'dawam_tasks',
  WORKER_STATUS: 'dawam_worker_status',
  NOTIFICATIONS: 'dawam_notifications',
};

// Initialize DB if empty
const initDB = () => {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  }
  if (!localStorage.getItem(KEYS.TASKS)) {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
  }
  if (!localStorage.getItem(KEYS.WORKER_STATUS)) {
    localStorage.setItem(KEYS.WORKER_STATUS, JSON.stringify({}));
  }
  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
};

initDB();

export const db = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  
  getUserByEmail: (email: string): User | undefined => {
    const users = db.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  createUser: (user: User) => {
    const users = db.getUsers();
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
        throw new Error('البريد الإلكتروني مسجل مسبقاً');
    }
    users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },
  
  updateUser: (user: User) => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) {
        users[index] = user;
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  },

  deleteUser: (id: string) => {
      const users = db.getUsers().filter(u => u.id !== id);
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  login: (user: User) => {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  getAttendance: (): AttendanceRecord[] => {
    return JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '[]');
  },

  addAttendance: (record: AttendanceRecord) => {
    const logs = db.getAttendance();
    logs.push(record);
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(logs));
    
    // Auto update status based on record type
    if (record.type === 'حضور') db.setWorkerStatus(record.user_id, 'active');
    if (record.type === 'انصراف') db.setWorkerStatus(record.user_id, 'offline');
  },

  getSettings: (): AppSettings => {
    return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify(INITIAL_SETTINGS));
  },

  updateSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  getTasks: (): Task[] => {
    return JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
  },

  addTask: (task: Task) => {
    const tasks = db.getTasks();
    tasks.push(task);
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  },

  toggleTaskCompletion: (taskId: string, reportContent?: string) => {
    const tasks = db.getTasks();
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { 
        ...t, 
        is_completed: !t.is_completed,
        report_response: reportContent || t.report_response 
      } : t
    );
    localStorage.setItem(KEYS.TASKS, JSON.stringify(updatedTasks));
  },

  // Status Management
  getAllWorkerStatuses: (): Record<string, WorkerStatus> => {
    return JSON.parse(localStorage.getItem(KEYS.WORKER_STATUS) || '{}');
  },

  getWorkerStatus: (userId: string): WorkerStatus => {
    const statuses = db.getAllWorkerStatuses();
    return statuses[userId] || 'offline';
  },

  setWorkerStatus: (userId: string, status: WorkerStatus) => {
    const statuses = db.getAllWorkerStatuses();
    statuses[userId] = status;
    localStorage.setItem(KEYS.WORKER_STATUS, JSON.stringify(statuses));
  },

  // Notifications
  getNotifications: (userId: string): AppNotification[] => {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    return all
      .filter((n: AppNotification) => n.userId === userId)
      .sort((a: AppNotification, b: AppNotification) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  addNotification: (note: AppNotification) => {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    all.push(note);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
  },

  markAllNotificationsRead: (userId: string) => {
    const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    const updated = all.map((n: AppNotification) => n.userId === userId ? { ...n, isRead: true } : n);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }
};
