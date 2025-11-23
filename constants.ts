
import { User, AppSettings, Task } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    full_name: 'مدير النظام',
    email: 'admin@company.com',
    role: 'admin',
    photo: 'https://picsum.photos/100/100?random=1',
  },
  {
    id: 'u2',
    full_name: 'أحمد محمد',
    email: 'ahmed@company.com',
    role: 'user',
    photo: 'https://picsum.photos/100/100?random=2',
  },
  {
    id: 'u3',
    full_name: 'سارة علي',
    email: 'sara@company.com',
    role: 'user',
    photo: 'https://picsum.photos/100/100?random=3',
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'مراجعة التقرير المالي',
    assigned_to: 'u2',
    is_completed: false,
    created_at: new Date().toISOString(),
    priority: 'urgent'
  }
];

// Default location (e.g., a dummy office location)
// User can update this in Admin panel to their current location for testing
export const INITIAL_SETTINGS: AppSettings = {
  location_lat: 24.7136, // Riyadh approx
  location_lng: 46.6753,
  radius: 0.5, // 500 meters
};

export const STRINGS = {
  app_name: 'دوام',
  login_title: 'تسجيل الدخول',
  email_placeholder: 'البريد الإلكتروني',
  login_btn: 'دخول',
  check_in: 'تسجيل حضور',
  check_out: 'تسجيل انصراف',
  records_title: 'سجل اليوم',
  outside_zone: 'أنت خارج موقع العمل',
  distance_label: 'البعد عن الموقع:',
  km: 'كم',
  confirm: 'تأكيد',
  cancel: 'إلغاء',
  camera_permission: 'يرجى السماح بالوصول للكاميرا',
  geo_permission: 'جاري تحديد الموقع...',
  admin_dashboard: 'لوحة التحكم',
  total_checkins: 'حضور اليوم',
  total_checkouts: 'انصراف اليوم',
  export_csv: 'تصدير Excel',
  settings: 'الإعدادات',
  update_location: 'تعيين الموقع الحالي كمقر عمل',
  logout: 'تسجيل خروج',
  ai_insight: 'تحليل الذكاء الاصطناعي',
  ai_loading: 'جاري التحليل...',
  tasks_title: 'المهام',
  my_tasks: 'مهامي اليومية',
  no_tasks: 'لا توجد مهام مسندة حالياً',
  task_completed: 'مكتملة',
  task_pending: 'قيد التنفيذ',
  assign_task: 'إسناد مهمة',
  task_desc: 'وصف المهمة',
  select_employee: 'اختر الموظف',
  add_task: 'إضافة',
  monthly_report: 'التقرير الشهري',
  total_hours: 'ساعات العمل',
  days_present: 'أيام الحضور',
  days_absent: 'أيام الغياب',
  view_reports: 'التقارير',
  view_tasks: 'المهام',
  view_monitor: 'المراقبة',
  view_users: 'الموظفين',
  priority_urgent: 'عاجل جداً',
  priority_routine: 'روتيني',
  priority_report: 'يتطلب تقرير',
  status_active: 'في العمل',
  status_break: 'في استراحة',
  status_offline: 'غير متاح',
  take_break: 'أخذ استراحة',
  resume_work: 'استئناف العمل',
  daily_summary: 'ملخص اليوم',
  tasks_progress: 'إنجاز المهام',
  write_report_placeholder: 'اكتب تقرير المهمة هنا...',
  submit_report: 'إرسال التقرير',
  confirm_checkout: 'تأكيد الانصراف',
  tasks_hidden_msg: 'سجل حضورك أولاً لتظهر المهام اليومية',
  notifications_title: 'الإشعارات',
  new_urgent_task: '🚨 مهمة عاجلة!',
  new_task: 'مهمة جديدة',
  daily_digest_subject: 'ملخص المهام اليومي',
  send_digest_btn: 'إرسال ملخص المهام (Email)',
  digest_sent_success: 'تم إرسال ملخص المهام عبر البريد الإلكتروني للموظفين',
  no_notifications: 'لا توجد إشعارات جديدة',
  mark_all_read: 'تحديد الكل كمقروء',
  // User Management
  manage_users: 'إدارة الموظفين',
  add_user: 'إضافة موظف',
  edit_user: 'تعديل',
  delete_user: 'حذف',
  full_name: 'الاسم الكامل',
  email_label: 'البريد الإلكتروني',
  role_label: 'الصلاحية',
  role_admin: 'مدير',
  role_user: 'موظف',
  save_btn: 'حفظ',
  delete_confirm: 'هل أنت متأكد من حذف هذا المستخدم؟',
  email_exists: 'البريد الإلكتروني مستخدم بالفعل',
  user_created: 'تم إنشاء المستخدم بنجاح',
  user_updated: 'تم تحديث بيانات المستخدم'
};
