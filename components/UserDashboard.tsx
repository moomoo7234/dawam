
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, LocationState, Task, WorkerStatus, AppNotification } from '../types';
import { db } from '../services/db';
import { calculateDistance, formatDistance } from '../utils/geo';
import { STRINGS } from '../constants';
import CameraCapture from './CameraCapture';
import { LogIn, LogOut, Clock, MapPin, AlertTriangle, History, Crosshair, CheckSquare, Calendar, Coffee, Briefcase, AlertCircle, FileText, Bell, Mail } from 'lucide-react';

interface Props {
  user: User;
}

const UserDashboard: React.FC<Props> = ({ user }) => {
  const [location, setLocation] = useState<LocationState>({ lat: null, lng: null, error: null, loading: true });
  const [distance, setDistance] = useState<number | null>(null);
  const [inZone, setInZone] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [actionType, setActionType] = useState<'حضور' | 'انصراف' | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myHistory, setMyHistory] = useState<AttendanceRecord[]>([]);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('offline');
  const [settings, setSettings] = useState(db.getSettings());
  
  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modal States
  const [reportTask, setReportTask] = useState<Task | null>(null);
  const [reportText, setReportText] = useState('');
  const [showCheckoutSummary, setShowCheckoutSummary] = useState(false);

  useEffect(() => {
    refreshData();
    requestNotificationPermission();

    // Poll for notifications
    const notifyInterval = setInterval(() => {
      checkNotifications();
    }, 3000);

    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, loading: false, error: 'Geolocation not supported' }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const dist = calculateDistance(lat, lng, settings.location_lat, settings.location_lng);
        
        setLocation({ lat, lng, error: null, loading: false });
        setDistance(dist);
        setInZone(dist <= settings.radius);
      },
      (err) => {
        setLocation(prev => ({ ...prev, loading: false, error: err.message }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(notifyInterval);
    };
  }, [settings]);

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  };

  const checkNotifications = () => {
    const all = db.getNotifications(user.id);
    setNotifications(all);
    const unread = all.filter(n => !n.isRead);
    setUnreadCount(unread.length);

    // Trigger Browser Notification for new unread items (simple check: if unread > previous, assume new)
    // For a robust system, we would track "last notified ID". 
    // Here we just notify for the latest unread if it is very recent (created in last 5 sec)
    if (unread.length > 0) {
      const latest = unread[0];
      const now = new Date().getTime();
      const notificationTime = new Date(latest.timestamp).getTime();
      
      // Only notify if created in last 4 seconds to avoid spamming on reload
      if (now - notificationTime < 4000) {
        if (Notification.permission === 'granted') {
          // Add extra attention for urgent tasks
          const options: NotificationOptions = {
             body: latest.message,
             icon: '/favicon.ico', // standard icon
          };
          if (latest.type === 'urgent') {
             options.requireInteraction = true; // Keep notification open until user clicks
          }
          new Notification(latest.title, options);
        }
        // Also show in-app toast
        setFeedback({ msg: latest.title, type: 'success' });
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  };

  const refreshData = () => {
    const all = db.getAttendance();
    const today = new Date().toISOString().split('T')[0];
    const mine = all.filter(r => r.user_id === user.id && r.date === today);
    setTodayRecords(mine);
    
    const history = all.filter(r => r.user_id === user.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setMyHistory(history);

    const tasks = db.getTasks();
    // Sort Tasks: Urgent -> Routine -> Completed at bottom
    const userTasks = tasks.filter(t => t.assigned_to === user.id).sort((a, b) => {
      if (a.is_completed && !b.is_completed) return 1;
      if (!a.is_completed && b.is_completed) return -1;
      const priorityWeight = { urgent: 3, report: 2, routine: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
    setMyTasks(userTasks);

    setWorkerStatus(db.getWorkerStatus(user.id));
    
    // Initial load of notifications
    const notifs = db.getNotifications(user.id);
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.isRead).length);
  };

  const handleMarkAllRead = () => {
    db.markAllNotificationsRead(user.id);
    refreshData();
  };

  const handleCheckInClick = () => {
    const lastCheckIn = todayRecords.filter(r => r.type === 'حضور').pop();
    if (lastCheckIn) {
      const lastTime = new Date(lastCheckIn.timestamp).getTime();
      const now = new Date().getTime();
      const diffHours = (now - lastTime) / (1000 * 60 * 60);
      if (diffHours < 1) {
        setFeedback({ msg: 'لقد قمت بتسجيل الحضور منذ أقل من ساعة', type: 'error' });
        setTimeout(() => setFeedback(null), 3000);
        return;
      }
    }
    setActionType('حضور');
    setShowCamera(true);
  };

  const initiateCheckout = () => {
    const hasCheckIn = todayRecords.some(r => r.type === 'حضور');
    if (!hasCheckIn) {
      setFeedback({ msg: 'لا يمكنك تسجيل الانصراف بدون تسجيل حضور أولاً', type: 'error' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    // Show Summary Modal first
    setShowCheckoutSummary(true);
  };

  const confirmCheckOut = () => {
    setActionType('انصراف');
    setShowCheckoutSummary(false);
    submitRecord(null); 
  };

  const submitRecord = (photo: string | null) => {
    if (!location.lat || !location.lng || !actionType) return;

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      user_id: user.id,
      type: actionType,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      gps_lat: location.lat,
      gps_lng: location.lng,
      selfie: photo || undefined
    };

    db.addAttendance(record);
    refreshData();
    setShowCamera(false);
    setActionType(null);
    setFeedback({ msg: `تم ${actionType} بنجاح`, type: 'success' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleTaskToggle = (task: Task) => {
    if (task.is_completed) {
       // Allow unchecking without modal
       db.toggleTaskCompletion(task.id);
       refreshData();
    } else {
       if (task.priority === 'report') {
         setReportTask(task);
         setReportText('');
       } else {
         db.toggleTaskCompletion(task.id);
         refreshData();
       }
    }
  };

  const submitTaskReport = () => {
    if (reportTask) {
      db.toggleTaskCompletion(reportTask.id, reportText);
      setReportTask(null);
      setReportText('');
      refreshData();
    }
  };

  const toggleBreakStatus = () => {
    const newStatus = workerStatus === 'active' ? 'break' : 'active';
    db.setWorkerStatus(user.id, newStatus);
    setWorkerStatus(newStatus);
  };

  const setWorkLocationToHere = () => {
    if (location.lat && location.lng) {
      const newSettings = {
        ...settings,
        location_lat: location.lat,
        location_lng: location.lng
      };
      db.updateSettings(newSettings);
      setSettings(newSettings);
      setFeedback({ msg: 'تم تحديث موقع العمل (وضع الاختبار)', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Helper for Summary
  const getDailySummary = () => {
     const checkIn = todayRecords.find(r => r.type === 'حضور');
     const startTime = checkIn ? new Date(checkIn.timestamp) : null;
     const now = new Date();
     const hours = startTime ? ((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2) : '0';
     const completed = myTasks.filter(t => t.is_completed).length;
     const remaining = myTasks.filter(t => !t.is_completed).length;
     
     return {
       startTime: startTime ? startTime.toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'}) : '-',
       endTime: now.toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'}),
       hours,
       completed,
       remaining
     };
  };

  const hasCheckedInToday = todayRecords.some(r => r.type === 'حضور');
  const summary = getDailySummary();

  return (
    <div className="pb-20 space-y-6 relative">
      {/* User Info Header */}
      <div className="bg-white p-6 rounded-b-3xl shadow-sm relative">
        <div className="flex items-center gap-4 mb-2">
          <img src={user.photo} alt={user.full_name} className="w-16 h-16 rounded-full border-2 border-primary p-0.5" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
            <div className="flex items-center gap-2">
              {workerStatus === 'active' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Briefcase size={10}/> {STRINGS.status_active}</span>}
              {workerStatus === 'break' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Coffee size={10}/> {STRINGS.status_break}</span>}
              {workerStatus === 'offline' && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">{STRINGS.status_offline}</span>}
            </div>
          </div>
          
          {/* Action Buttons: Break & Notifications */}
          <div className="flex flex-col gap-2 items-end">
             <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-600 transition relative"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                  )}
                </button>
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute top-10 left-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                       <span className="font-bold text-xs">{STRINGS.notifications_title}</span>
                       <button onClick={handleMarkAllRead} className="text-[10px] text-primary hover:underline">{STRINGS.mark_all_read}</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 p-4">{STRINGS.no_notifications}</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                             <div className="flex items-start gap-2">
                               {n.type === 'digest' ? <Mail size={14} className="text-purple-500 mt-1" /> : <AlertCircle size={14} className={`${n.type === 'urgent' ? 'text-red-500' : 'text-blue-500'} mt-1`} />}
                               <div>
                                 <p className={`text-xs ${!n.isRead ? 'font-bold' : ''}`}>{n.title}</p>
                                 <p className="text-[10px] text-gray-500">{n.message}</p>
                                 <p className="text-[9px] text-gray-400 mt-1">{new Date(n.timestamp).toLocaleTimeString('ar-SA')}</p>
                               </div>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
             </div>

             {hasCheckedInToday && workerStatus !== 'offline' && (
              <button 
                onClick={toggleBreakStatus}
                className={`flex flex-col items-center justify-center p-2 rounded-lg w-12 text-xs font-bold transition ${workerStatus === 'active' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}
              >
                {workerStatus === 'active' ? <Coffee size={18} /> : <Briefcase size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Location Status */}
      <div className="mx-4">
        {location.loading ? (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-xl flex items-center justify-center gap-2 text-sm animate-pulse">
            <MapPin size={18} />
            {STRINGS.geo_permission}
          </div>
        ) : location.error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-2 text-sm">
            <AlertTriangle size={18} />
             حدث خطأ في تحديد الموقع
          </div>
        ) : (
          <div className={`p-4 rounded-xl flex flex-col gap-2 text-sm transition-colors ${inZone ? 'bg-teal-50 text-teal-800 border border-teal-100' : 'bg-orange-50 text-orange-800 border border-orange-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span className="font-medium">{inZone ? 'أنت في موقع العمل' : STRINGS.outside_zone}</span>
              </div>
              {distance !== null && (
                <span className="font-bold ltr">{formatDistance(distance)}</span>
              )}
            </div>
            {!inZone && (
              <button 
                onClick={setWorkLocationToHere}
                className="flex items-center gap-1 self-start text-xs underline opacity-70 hover:opacity-100 mt-1"
              >
                <Crosshair size={12} />
                (اختبار) تعيين موقعي الحالي كمقر عمل
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-4 left-4 right-4 z-[60] p-4 rounded-lg shadow-lg text-white text-center transform transition-all ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mx-4">
        <button
          onClick={handleCheckInClick}
          disabled={!inZone || location.loading}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm transition-all transform active:scale-95 ${!inZone ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-primary hover:bg-teal-50 border border-teal-100'}`}
        >
          <div className={`p-3 rounded-full mb-2 ${!inZone ? 'bg-gray-200' : 'bg-teal-100'}`}>
            <LogIn size={24} />
          </div>
          <span className="font-bold">{STRINGS.check_in}</span>
        </button>

        <button
          onClick={initiateCheckout}
          disabled={!inZone || location.loading}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm transition-all transform active:scale-95 ${!inZone ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-secondary hover:bg-orange-50 border border-orange-100'}`}
        >
           <div className={`p-3 rounded-full mb-2 ${!inZone ? 'bg-gray-200' : 'bg-orange-100'}`}>
            <LogOut size={24} />
          </div>
          <span className="font-bold">{STRINGS.check_out}</span>
        </button>
      </div>

      {/* TASKS SECTION - Hidden until Check-in */}
      <div className={`mx-4 rounded-2xl shadow-sm overflow-hidden border transition-all duration-500 ${hasCheckedInToday ? 'bg-white border-gray-100 opacity-100 max-h-[1000px]' : 'bg-gray-50 border-gray-200 opacity-60 max-h-[80px]'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-l from-white to-gray-50">
          <CheckSquare size={18} className="text-secondary" />
          <h3 className="font-bold text-gray-800">{STRINGS.my_tasks}</h3>
        </div>
        
        {!hasCheckedInToday ? (
           <div className="p-4 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
              <AlertCircle size={20} />
              {STRINGS.tasks_hidden_msg}
           </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {myTasks.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">{STRINGS.no_tasks}</p>
            ) : (
              myTasks.map(task => (
                <div key={task.id} className={`p-4 flex items-start justify-between ${task.priority === 'urgent' && !task.is_completed ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={task.is_completed} 
                        onChange={() => handleTaskToggle(task)}
                        className="mt-1 w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                           {task.priority === 'urgent' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded border border-red-200">{STRINGS.priority_urgent}</span>}
                           {task.priority === 'report' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded border border-blue-200">{STRINGS.priority_report}</span>}
                           <p className={`font-medium ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                             {task.title}
                           </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{new Date(task.created_at).toLocaleDateString('ar-SA')}</p>
                        {task.report_response && <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><FileText size={10}/> تم إرفاق التقرير</p>}
                      </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Today's Records */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <History size={18} className="text-gray-400" />
          <h3 className="font-bold text-gray-800">{STRINGS.records_title}</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {todayRecords.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">لا توجد سجلات اليوم</p>
          ) : (
            todayRecords.slice().reverse().map(record => (
              <div key={record.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-10 rounded-full ${record.type === 'حضور' ? 'bg-teal-500' : 'bg-orange-500'}`}></div>
                  <div>
                    <p className="font-bold text-gray-800">{record.type}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock size={12} />
                      {new Date(record.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                {record.selfie && (
                  <img src={record.selfie} alt="Proof" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportTask && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="font-bold text-lg mb-2">{STRINGS.priority_report}</h3>
            <p className="text-sm text-gray-600 mb-4">يجب كتابة تقرير مختصر لإتمام هذه المهمة:</p>
            <p className="font-bold text-primary mb-2">{reportTask.title}</p>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg h-32 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder={STRINGS.write_report_placeholder}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={submitTaskReport} className="flex-1 bg-primary text-white py-2 rounded-lg font-bold">
                {STRINGS.submit_report}
              </button>
              <button onClick={() => setReportTask(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">
                {STRINGS.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Summary Modal */}
      {showCheckoutSummary && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fadeIn">
            <h3 className="font-bold text-xl text-center mb-6 text-gray-800 border-b pb-4">{STRINGS.daily_summary}</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">وقت الحضور</span>
                <span className="font-bold text-teal-700">{summary.startTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">وقت الانصراف</span>
                <span className="font-bold text-orange-700">{summary.endTime}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg">
                <span className="text-blue-800 text-sm font-bold">إجمالي الساعات</span>
                <span className="font-bold text-blue-800">{summary.hours} س</span>
              </div>
              
              <div className="border-t border-dashed pt-4">
                 <p className="text-sm text-gray-500 mb-2">{STRINGS.tasks_progress}</p>
                 <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-green-100 rounded p-2">
                       <span className="block text-lg font-bold text-green-700">{summary.completed}</span>
                       <span className="text-xs text-green-600">منجزة</span>
                    </div>
                    <div className="bg-red-100 rounded p-2">
                       <span className="block text-lg font-bold text-red-700">{summary.remaining}</span>
                       <span className="text-xs text-red-600">متبقية</span>
                    </div>
                 </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={confirmCheckOut} className="flex-1 bg-secondary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition">
                {STRINGS.confirm_checkout}
              </button>
              <button onClick={() => setShowCheckoutSummary(false)} className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                {STRINGS.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={(img) => submitRecord(img)}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default UserDashboard;
