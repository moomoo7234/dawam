import React, { useState, useEffect } from 'react';
import { User } from './types';
import { db } from './services/db';
import { STRINGS, INITIAL_USERS } from './constants';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import { LogOut, LayoutGrid, ClipboardList } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

  useEffect(() => {
    const currentUser = db.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = db.getUserByEmail(email);
    
    if (foundUser) {
      db.login(foundUser);
      setUser(foundUser);
      setError('');
    } else {
      setError('المستخدم غير موجود. جرب: admin@company.com');
    }
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
    setEmail('');
    setView('dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-primary h-32 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white tracking-wider">{STRINGS.app_name}</h1>
          </div>
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">{STRINGS.login_title}</h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {STRINGS.email_placeholder}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-right"
                  placeholder="name@company.com"
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-primary hover:bg-teal-700 text-white font-bold rounded-lg transition shadow-md"
              >
                {STRINGS.login_btn}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400 mb-2">للتجربة السريعة:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {INITIAL_USERS.map(u => (
                  <button 
                    key={u.email}
                    onClick={() => setEmail(u.email)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 transition"
                  >
                    {u.role}: {u.email}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative">
        {/* Header Bar */}
        <div className="bg-primary text-white p-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
          <h1 className="text-xl font-bold">{STRINGS.app_name}</h1>
          <button onClick={handleLogout} className="text-teal-100 hover:text-white transition p-2">
            <LogOut size={20} />
          </button>
        </div>

        {/* Admin Navigation */}
        {user.role === 'admin' && (
           <div className="flex border-b border-gray-200 bg-white">
             <button 
               onClick={() => setView('dashboard')}
               className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${view === 'dashboard' ? 'text-primary border-b-2 border-primary bg-teal-50' : 'text-gray-500'}`}
             >
               <ClipboardList size={18} />
               المستخدم
             </button>
             <button 
               onClick={() => setView('admin')}
               className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${view === 'admin' ? 'text-primary border-b-2 border-primary bg-teal-50' : 'text-gray-500'}`}
             >
               <LayoutGrid size={18} />
               {STRINGS.admin_dashboard}
             </button>
           </div>
        )}

        {/* Content */}
        <div className="min-h-[calc(100vh-140px)]">
           {view === 'dashboard' ? (
             <UserDashboard user={user} />
           ) : (
             <div className="p-4">
               <AdminPanel user={user} />
             </div>
           )}
        </div>
        
      </div>
    </div>
  );
};

export default App;