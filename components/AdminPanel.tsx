
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, AttendanceRecord, AppSettings, Task, TaskPriority, WorkerStatus, Role } from '../types';
import { STRINGS } from '../constants';
import { Download, Users, CheckCircle, XCircle, MapPin, Brain, CheckSquare, BarChart2, Plus, Coffee, Activity, AlertCircle, FileText, Mail, Send, UserPlus, Trash2, Edit2, Shield, Save, X } from 'lucide-react';
import { analyzeAttendance } from '../services/geminiService';

interface Props {
  user: User;
}

type Tab = 'monitor' | 'tasks' | 'reports' | 'users';

const AdminPanel: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<Tab>('monitor');
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workerStatuses, setWorkerStatuses] = useState<Record<string, WorkerStatus>>({});
  const [settings, setSettings] = useState<AppSettings>(db.getSettings());
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedUserForTask, setSelectedUserForTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('routine');

  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', role: 'user' as Role });

  useEffect(() => {
    refreshData();
    // Poll for live status updates
    const interval = setInterval(() => {
       setWorkerStatuses(db.getAllWorkerStatuses());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setLogs(db.getAttendance());
    setUsers(db.getUsers());
    setTasks(db.getTasks());
    setWorkerStatuses(db.getAllWorkerStatuses());
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysLogs = logs.filter(l => l.date === todayStr);
  const checkIns = todaysLogs.filter(l => l.type === 'حضور').length;
  const checkOuts = todaysLogs.filter(l => l.type === 'انصراف').length;

  const exportCSV = () => {
    const header = ['ID', 'User', 'Type', 'Time', 'Date', 'Lat', 'Lng'];
    const rows = logs.map(l => {
      const u = users.find(u => u.id === l.user_id);
      return [l.id, u?.full_name || 'Unknown', l.type, l.timestamp, l.date, l.gps_lat, l.gps_lng].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newSettings = {
          ...settings,
          location_lat: pos.coords.latitude,
          location_lng: pos.coords.longitude
        };
        setSettings(newSettings);
        db.updateSettings(newSettings);
        alert('تم تحديث موقع العمل إلى موقعك الحالي');
      });
    }
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeAttendance(logs, users);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !selectedUserForTask) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      assigned_to: selectedUserForTask,
      is_completed: false,
      created_at: new Date().toISOString(),
      priority: newTaskPriority
    };

    db.addTask(task);

    // Send Notification
    db.addNotification({
      id: Date.now().toString(),
      userId: selectedUserForTask,
      title: newTaskPriority === 'urgent' ? STRINGS.new_urgent_task : STRINGS.new_task,
      message: `تم إسناد مهمة جديدة: ${newTaskTitle}`,
      type: newTaskPriority === 'urgent' ? 'urgent' : 'info',
      timestamp: new Date().toISOString(),
      isRead: false
    });

    setNewTaskTitle('');
    setNewTaskPriority('routine');
    refreshData();
    alert('تم إضافة المهمة وإرسال إشعار للموظف');
  };

  const handleSendDigest = () => {
    const pendingTasks = tasks.filter(t => !t.is_completed);
    const usersWithTasks: string[] = Array.from(new Set(pendingTasks.map(t => t.assigned_to)));
    
    usersWithTasks.forEach(userId => {
      const count = pendingTasks.filter(t => t.assigned_to === userId).length;
      if (count > 0) {
        db.addNotification({
          id: Date.now().toString() + userId,
          userId: userId,
          title: STRINGS.daily_digest_subject,
          message: `لديك ${count} مهام معلقة اليوم. يرجى مراجعة لوحة المهام.`,
          type: 'digest',
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    });
    alert(STRINGS.digest_sent_success);
  };

  // User Management Functions
  const openUserModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setUserForm({ fullName: u.full_name, email: u.email, role: u.role });
    } else {
      setEditingUser(null);
      setUserForm({ fullName: '', email: '', role: 'user' });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (editingUser) {
            db.updateUser({
                ...editingUser,
                full_name: userForm.fullName,
                email: userForm.email,
                role: userForm.role
            });
            alert(STRINGS.user_updated);
        } else {
            const newUser: User = {
                id: 'u' + Date.now(),
                full_name: userForm.fullName,
                email: userForm.email,
                role: userForm.role,
                photo: `https://picsum.photos/100/100?random=${Date.now()}`
            };
            db.createUser(newUser);
            alert(STRINGS.user_created);
        }
        setIsUserModalOpen(false);
        refreshData();
    } catch (error: any) {
        alert(error.message);
    }
  };

  const handleDeleteUser = (userId: string) => {
      if (userId === user.id) {
          alert('لا يمكنك حذف حسابك الحالي');
          return;
      }
      if (window.confirm(STRINGS.delete_confirm)) {
          db.deleteUser(userId);
          refreshData();
      }
  };

  const calculateUserStats = (userId: string) => {
    const userLogs = logs.filter(l => l.user_id === userId);
    // Group by date
    const days: {[key: string]: {in?: string, out?: string}} = {};
    
    userLogs.forEach(log => {
      if (!days[log.date]) days[log.date] = {};
      if (log.type === 'حضور') days[log.date].in = log.timestamp;
      if (log.type === 'انصراف') days[log.date].out = log.timestamp;
    });

    let totalHours = 0;
    let presentDays = 0;

    Object.values(days).forEach(day => {
      if (day.in) {
        presentDays++;
        if (day.out) {
          const start = new Date(day.in).getTime();
          const end = new Date(day.out).getTime();
          totalHours += (end - start) / (1000 * 60 * 60);
        }
      }
    });

    return { totalHours: totalHours.toFixed(2), presentDays };
  };

  const getStatusBadge = (status: WorkerStatus) => {
    switch (status) {
      case 'active': return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold"><Activity size={12}/> {STRINGS.status_active}</span>;
      case 'break': return <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold"><Coffee size={12}/> {STRINGS.status_break}</span>;
      default: return <span className="flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-bold">{STRINGS.status_offline}</span>;
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">{STRINGS.priority_urgent}</span>;
      case 'report': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">{STRINGS.priority_report}</span>;
      default: return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">{STRINGS.priority_routine}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Tabs Navigation */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('monitor')}
          className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'monitor' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <CheckCircle size={16} /> {STRINGS.view_monitor}
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'tasks' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <CheckSquare size={16} /> {STRINGS.view_tasks}
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'reports' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <BarChart2 size={16} /> {STRINGS.view_reports}
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[100px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Users size={16} /> {STRINGS.view_users}
        </button>
      </div>

      {/* MONITOR TAB */}
      {activeTab === 'monitor' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-primary mb-2">
                <CheckCircle size={20} />
                <h3 className="font-bold text-sm">{STRINGS.total_checkins}</h3>
              </div>
              <p className="text-3xl font-bold text-gray-800">{checkIns}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-secondary mb-2">
                <XCircle size={20} />
                <h3 className="font-bold text-sm">{STRINGS.total_checkouts}</h3>
              </div>
              <p className="text-3xl font-bold text-gray-800">{checkOuts}</p>
            </div>
          </div>
          
          {/* Live Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {users.filter(u => u.role !== 'admin').map(u => (
              <div key={u.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                 <div className="flex items-center gap-2">
                   <img src={u.photo} className="w-10 h-10 rounded-full" alt={u.full_name} />
                   <div>
                     <p className="font-bold text-sm text-gray-800">{u.full_name}</p>
                     <p className="text-xs text-gray-500">ID: {u.id}</p>
                   </div>
                 </div>
                 <div>
                   {getStatusBadge(workerStatuses[u.id] || 'offline')}
                 </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button onClick={exportCSV} className="flex-shrink-0 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              <Download size={16} />
              {STRINGS.export_csv}
            </button>
            <button onClick={updateLocation} className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              <MapPin size={16} />
              {STRINGS.update_location}
            </button>
            {process.env.API_KEY && (
              <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="flex-shrink-0 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                <Brain size={16} />
                {isAnalyzing ? STRINGS.ai_loading : STRINGS.ai_insight}
              </button>
            )}
          </div>

          {/* AI Result */}
          {aiAnalysis && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-purple-900 text-sm whitespace-pre-wrap">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Brain size={16} /> تقرير الذكاء الاصطناعي
              </h4>
              {aiAnalysis}
            </div>
          )}

          {/* Full Log Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center">
              <span>سجل الحضور الكامل</span>
              <Users size={18} className="text-gray-400"/>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-3">الموظف</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">الوقت</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الصورة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.slice().reverse().map(log => {
                    const u = users.find(u => u.id === log.user_id);
                    return (
                      <tr key={log.id}>
                        <td className="p-3 font-medium text-gray-900">{u?.full_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${log.type === 'حضور' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">{new Date(log.timestamp).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</td>
                        <td className="p-3 text-gray-500">{log.date}</td>
                        <td className="p-3">
                          {log.selfie ? (
                            <img src={log.selfie} alt="Selfie" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Add Task Form */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
               <Plus size={18} className="text-primary" />
               {STRINGS.assign_task}
             </h3>
             <form onSubmit={handleAddTask} className="space-y-4">
               <div>
                 <label className="block text-sm text-gray-600 mb-1">{STRINGS.task_desc}</label>
                 <input 
                    type="text" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="مثال: مراجعة حسابات شهر مارس"
                    required
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm text-gray-600 mb-1">{STRINGS.select_employee}</label>
                   <select 
                      value={selectedUserForTask}
                      onChange={(e) => setSelectedUserForTask(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                   >
                     <option value="">-- اختر موظف --</option>
                     {users.filter(u => u.role !== 'admin').map(u => (
                       <option key={u.id} value={u.id}>{u.full_name}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm text-gray-600 mb-1">الأولوية</label>
                   <select 
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                   >
                     <option value="routine">{STRINGS.priority_routine}</option>
                     <option value="urgent">{STRINGS.priority_urgent}</option>
                     <option value="report">{STRINGS.priority_report}</option>
                   </select>
                 </div>
               </div>

               <button type="submit" className="w-full py-2 bg-primary text-white rounded-lg font-bold hover:bg-teal-700 transition">
                 {STRINGS.add_task}
               </button>
             </form>
          </div>
          
          <button 
            onClick={handleSendDigest}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition shadow-md"
          >
            <Mail size={18} />
            {STRINGS.send_digest_btn}
          </button>

          {/* All Tasks List */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 px-1">جميع المهام المسندة</h3>
            {tasks.slice().reverse().map(task => {
              const assignedUser = users.find(u => u.id === task.assigned_to);
              return (
                <div key={task.id} className={`bg-white p-4 rounded-xl border flex flex-col gap-2 ${task.priority === 'urgent' && !task.is_completed ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getPriorityBadge(task.priority)}
                        <p className={`font-bold ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {task.title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        مسندة إلى: <span className="text-primary">{assignedUser?.full_name}</span> | {new Date(task.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div>
                      {task.is_completed ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{STRINGS.task_completed}</span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">{STRINGS.task_pending}</span>
                      )}
                    </div>
                  </div>
                  {task.report_response && (
                    <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                       <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><FileText size={10}/> تقرير الموظف:</p>
                       <p className="text-gray-700">{task.report_response}</p>
                    </div>
                  )}
                </div>
              );
            })}
            {tasks.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد مهام</p>}
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fadeIn">
          {users.filter(u => u.role !== 'admin').map(u => {
             const stats = calculateUserStats(u.id);
             return (
               <div key={u.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                 <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
                   <img src={u.photo} alt={u.full_name} className="w-10 h-10 rounded-full" />
                   <div>
                     <h3 className="font-bold text-gray-900">{u.full_name}</h3>
                     <p className="text-xs text-gray-500">{u.email}</p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">{STRINGS.total_hours}</p>
                      <p className="text-lg font-bold text-blue-800">{stats.totalHours}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg">
                      <p className="text-xs text-green-600 font-medium mb-1">{STRINGS.days_present}</p>
                      <p className="text-lg font-bold text-green-800">{stats.presentDays}</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg">
                      <p className="text-xs text-red-600 font-medium mb-1">الغياب</p>
                      <p className="text-lg font-bold text-red-800">-</p> 
                    </div>
                 </div>
               </div>
             );
          })}
        </div>
      )}

      {/* USERS MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    {STRINGS.manage_users}
                </h3>
                <button 
                  onClick={() => openUserModal()}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-teal-700 transition"
                >
                    <UserPlus size={18} />
                    {STRINGS.add_user}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {users.map(u => (
                    <div key={u.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img src={u.photo} alt={u.full_name} className="w-12 h-12 rounded-full border border-gray-200" />
                            <div>
                                <h4 className="font-bold text-gray-900">{u.full_name}</h4>
                                <p className="text-xs text-gray-500">{u.email}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {u.role === 'admin' ? STRINGS.role_admin : STRINGS.role_user}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => openUserModal(u)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title={STRINGS.edit_user}
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className={`p-2 text-red-600 hover:bg-red-50 rounded-lg transition ${u.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={STRINGS.delete_user}
                                disabled={u.id === user.id}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fadeIn">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">
                                {editingUser ? STRINGS.edit_user : STRINGS.add_user}
                            </h3>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">{STRINGS.full_name}</label>
                                <input 
                                    type="text" 
                                    required
                                    value={userForm.fullName}
                                    onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">{STRINGS.email_label}</label>
                                <input 
                                    type="email" 
                                    required
                                    value={userForm.email}
                                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ltr"
                                    placeholder="user@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">{STRINGS.role_label}</label>
                                <div className="flex gap-2">
                                    <label className={`flex-1 cursor-pointer p-2 rounded-lg border text-center text-sm font-bold transition ${userForm.role === 'user' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>
                                        <input 
                                            type="radio" 
                                            name="role" 
                                            value="user" 
                                            checked={userForm.role === 'user'} 
                                            onChange={() => setUserForm({...userForm, role: 'user'})}
                                            className="hidden" 
                                        />
                                        <Users size={16} className="inline mx-1" />
                                        {STRINGS.role_user}
                                    </label>
                                    <label className={`flex-1 cursor-pointer p-2 rounded-lg border text-center text-sm font-bold transition ${userForm.role === 'admin' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                                        <input 
                                            type="radio" 
                                            name="role" 
                                            value="admin" 
                                            checked={userForm.role === 'admin'} 
                                            onChange={() => setUserForm({...userForm, role: 'admin'})}
                                            className="hidden" 
                                        />
                                        <Shield size={16} className="inline mx-1" />
                                        {STRINGS.role_admin}
                                    </label>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-teal-700 transition flex justify-center gap-2">
                                <Save size={18} />
                                {STRINGS.save_btn}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
