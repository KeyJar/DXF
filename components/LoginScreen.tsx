
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { User as UserIcon, Lock, ArrowRight, CheckSquare, Square } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // New State for features
  const [rememberPassword, setRememberPassword] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);

  // Pre-fill generic avatar if empty
  const getAvatar = (name: string) => 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=b45309&color=fff`;

  // Check for saved credentials on mount
  useEffect(() => {
    const savedPref = localStorage.getItem('archaeo_login_pref');
    if (savedPref) {
      const pref = JSON.parse(savedPref);
      if (pref.remember) {
        setUsername(pref.username || '');
        setPassword(pref.password || '');
        setRememberPassword(true);
        setAutoLogin(pref.autoLogin || false);

        // Trigger Auto Login
        if (pref.autoLogin && pref.username && pref.password) {
            performLogin(pref.username, pref.password, true);
        }
      }
    }
  }, []);

  const performLogin = (u: string, p: string, isAuto: boolean = false) => {
    try {
        const storedUsers = localStorage.getItem('archaeo_users');
        const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];

        const user = users.find(existing => existing.username === u && existing.password === p);
        
        // Backdoor for admin/admin
        if (!user && u === 'admin' && p === 'admin') {
             const adminUser = {
                username: 'admin',
                displayName: '管理员',
                avatarUrl: getAvatar('Admin')
             };
             onLogin(adminUser);
             return true;
        }

        if (user) {
          onLogin(user);
          return true;
        } else {
          if (!isAuto) setError('用户名或密码错误');
          return false;
        }
    } catch (err) {
        if (!isAuto) setError('系统错误');
        return false;
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    try {
      const storedUsers = localStorage.getItem('archaeo_users');
      const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];

      if (isRegistering) {
        if (users.find(u => u.username === username)) {
          setError('用户名已存在');
          return;
        }
        
        // Default display name to username, default avatar generated from username
        const newUser: User = {
          username,
          password,
          displayName: username, 
          avatarUrl: getAvatar(username),
          createdAt: Date.now()
        };
        
        const updatedUsers = [...users, newUser];
        localStorage.setItem('archaeo_users', JSON.stringify(updatedUsers));
        
        // Auto save pref on register if checked
        if (rememberPassword) {
            localStorage.setItem('archaeo_login_pref', JSON.stringify({
                username, password, remember: true, autoLogin
            }));
        } else {
            localStorage.removeItem('archaeo_login_pref');
        }

        onLogin(newUser);
      } else {
        // Login Logic
        const success = performLogin(username, password);
        if (success) {
            // Save Preferences
            if (rememberPassword) {
                localStorage.setItem('archaeo_login_pref', JSON.stringify({
                    username, password, remember: true, autoLogin
                }));
            } else {
                localStorage.removeItem('archaeo_login_pref');
            }
        }
      }
    } catch (err) {
      setError('系统错误，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-stone-200 relative overflow-hidden">
        {/* Decorative Bg */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-terra-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-terra-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-terra-600/30 rotate-3">
               {/* Sharper Tip, Smooth Handle, Tilted 45 Degrees */}
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <g transform="rotate(45 12 12)">
                      <path d="M12 24L7.5 13H11V11H10.5V2.5C10.5 1.67 11.17 1 12 1C12.83 1 13.5 1.67 13.5 2.5V11H13V13H16.5L12 24Z" />
                  </g>
               </svg>
            </div>
            <h1 className="text-3xl font-serif font-bold text-stone-800">Archaeology</h1>
            <p className="text-stone-400 text-sm mt-2 font-medium tracking-wide">
              {isRegistering ? '创建新的考古档案账户' : '考古出土器物数字档案'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">用户名 (账号)</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none transition-all font-bold text-stone-700"
                  placeholder="请输入账号"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none transition-all font-bold text-stone-700"
                  placeholder="请输入密码"
                />
              </div>
            </div>
            
            {!isRegistering && (
                <div className="flex items-center justify-between px-1">
                    <div 
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => {
                            const newState = !rememberPassword;
                            setRememberPassword(newState);
                            if (!newState) setAutoLogin(false); // Uncheck auto login if remember is unchecked
                        }}
                    >
                        {rememberPassword ? 
                            <CheckSquare size={16} className="text-terra-600" /> : 
                            <Square size={16} className="text-stone-300 group-hover:text-stone-400" />
                        }
                        <span className={`text-xs font-bold ${rememberPassword ? 'text-terra-700' : 'text-stone-400 group-hover:text-stone-500'}`}>记住密码</span>
                    </div>

                    <div 
                        className={`flex items-center gap-2 cursor-pointer group ${!rememberPassword ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => setAutoLogin(!autoLogin)}
                    >
                         {autoLogin ? 
                            <CheckSquare size={16} className="text-terra-600" /> : 
                            <Square size={16} className="text-stone-300 group-hover:text-stone-400" />
                        }
                        <span className={`text-xs font-bold ${autoLogin ? 'text-terra-700' : 'text-stone-400 group-hover:text-stone-500'}`}>自动登录</span>
                    </div>
                </div>
            )}

            {error && <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg font-medium">{error}</div>}

            <button type="submit" className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2 mt-4 group">
               {isRegistering ? '立即注册' : '登录系统'}
               <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-center">
             <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-sm text-stone-500 hover:text-terra-600 font-bold transition-colors"
             >
                {isRegistering ? '已有账号？返回登录' : '没有账号？点击注册'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
