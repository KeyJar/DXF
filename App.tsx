
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Layers, Activity, Trash2, User as UserIcon, PenTool, Download, Upload, Calendar, Edit2, LogOut, Key, Camera, ChevronDown, UserCircle, X, FolderOpen, Settings, FolderInput, HardDrive, Hash, Tag, ArrowLeft, LayoutGrid, List as ListIcon, FileSpreadsheet, MapPin } from 'lucide-react';
import { Artifact, User, ArtifactImage } from './types';
import ArtifactForm from './components/ArtifactForm';
import ArtifactDetails from './components/ArtifactDetails';
import StatsChart from './components/StatsChart';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// App Brand Logo: Stylized Archaeological Trowel
const AppLogo = ({ className = "h-6 w-6", size }: { className?: string; size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Handle & Shank */}
    <path d="M18.36 2.64a2 2 0 0 0-2.83 0l-1.41 1.41a1 1 0 0 0 0 1.42l.7.7-2.12 2.12-2.12-2.12a1 1 0 0 0-1.42 0L8.46 6.88l-4.24 8.48a1 1 0 0 0 1.3 1.3l8.48-4.24.71-.71a1 1 0 0 0 0-1.42l-2.12-2.12 2.12-2.12.7.7a1 1 0 0 0 1.42 0l1.41-1.41a2 2 0 0 0 0-2.83z" opacity="0.9"/>
    <path d="M10.5 13.5L3 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
);

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// 头像专用压缩函数
const compressAvatar = (base64Str: string, maxWidth = 300, maxHeight = 300): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    }
  });
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // New View States
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Auth States
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<User>>({ displayName: '', avatarUrl: '' });
  const [profilePassword, setProfilePassword] = useState({ new: '', confirm: '' });

  useEffect(() => {
    // Load Artifacts
    const savedArtifacts = localStorage.getItem('archaeo_artifacts');
    if (savedArtifacts) {
      try {
        setArtifacts(JSON.parse(savedArtifacts));
      } catch (e) {
        console.error("Failed to parse artifacts", e);
      }
    }

    // Load Session
    const savedSession = localStorage.getItem('archaeo_session');
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('archaeo_artifacts', JSON.stringify(artifacts));
      } catch (error) {
        if (error instanceof Error && (error.name === 'QuotaExceededError')) {
          alert("存储空间已满！请删除部分记录或减小图片大小。");
        }
      }
    }
  }, [artifacts, loading]);

  // --- Auth Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) return;
    
    const usersJson = localStorage.getItem('archaeo_users');
    const users: User[] = usersJson ? JSON.parse(usersJson) : [];
    
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('archaeo_session', JSON.stringify(user));
    } else {
      alert("账号或密码错误");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) return;

    const usersJson = localStorage.getItem('archaeo_users');
    const users: User[] = usersJson ? JSON.parse(usersJson) : [];
    
    if (users.find(u => u.username === loginForm.username)) {
      alert("该账号已存在");
      return;
    }

    const newUser: User = {
      username: loginForm.username,
      password: loginForm.password,
      displayName: loginForm.username,
      avatarUrl: '',
      settings: { autoRenameExport: true, exportPath: '' }
    };

    const newUsers = [...users, newUser];
    localStorage.setItem('archaeo_users', JSON.stringify(newUsers));
    setCurrentUser(newUser);
    localStorage.setItem('archaeo_session', JSON.stringify(newUser));
    alert("注册成功！");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('archaeo_session');
    setShowUserMenu(false);
  };

  const updateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (profilePassword.new && profilePassword.new !== profilePassword.confirm) {
      alert("密码不一致");
      return;
    }

    const usersJson = localStorage.getItem('archaeo_users');
    let users: User[] = usersJson ? JSON.parse(usersJson) : [];
    
    const updatedUser: User = { 
      ...currentUser, 
      ...profileForm,
      displayName: profileForm.displayName?.trim() || currentUser.displayName,
      avatarUrl: profileForm.avatarUrl || currentUser.avatarUrl,
      password: profilePassword.new || currentUser.password,
      settings: {
        ...currentUser.settings,
        ...profileForm.settings,
        exportPath: profileForm.settings?.exportPath?.trim() 
      }
    };

    const newUsers = users.map(u => u.username === currentUser.username ? updatedUser : u);
    localStorage.setItem('archaeo_users', JSON.stringify(newUsers));
    setCurrentUser(updatedUser);
    localStorage.setItem('archaeo_session', JSON.stringify(updatedUser));
    
    setShowProfileModal(false);
    alert("个人设置已保存");
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressAvatar(base64);
          setProfileForm(prev => ({ ...prev, avatarUrl: compressed }));
        } catch (error) {
          setProfileForm(prev => ({ ...prev, avatarUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  // --- Data Handlers ---

  const handleSave = (data: Omit<Artifact, 'id' | 'createdAt'>) => {
    if (editingArtifact) {
      setArtifacts(prev => prev.map(a => 
        a.id === editingArtifact.id 
          ? { ...a, ...data } 
          : a
      ));
      setEditingArtifact(null);
    } else {
      const newArtifact: Artifact = {
        ...data,
        id: generateId(),
        createdAt: Date.now(),
      };
      setArtifacts(prev => [newArtifact, ...prev]);
    }
    setShowForm(false);
  };

  const handleEdit = (artifact: Artifact) => {
    setEditingArtifact(artifact);
    setShowForm(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (confirmDeleteId === id) {
      setArtifacts(prev => prev.filter(a => a.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
    }
  };

  // --- Export / Import Handlers ---

  const generateExcelData = (data: Artifact[]) => {
    return data.map(a => ({
      '遗址名称': a.siteName,
      '探方/单位': a.unit || '',
      '层位': a.layer || '',
      '编号': a.serialNumber || '',
      '器物名称': a.name,
      '器类': a.category || '',
      '质地': a.material,
      '数量': a.quantity,
      '保存状况': a.condition,
      '尺寸': a.dimensions,
      '出土日期': a.excavationDate,
      '发现者': a.finder || '',
      '录入者': a.recorder || '',
      '描述': a.description
    }));
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(generateExcelData(artifacts));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "全部文物记录");
    XLSX.writeFile(wb, `ArchaeoLog_All_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportSiteExcel = (siteName: string) => {
    const siteArtifacts = artifacts.filter(a => a.siteName === siteName);
    const ws = XLSX.utils.json_to_sheet(generateExcelData(siteArtifacts));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, siteName);
    XLSX.writeFile(wb, `ArchaeoLog_${siteName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportZip = async () => {
    if (artifacts.length === 0) {
        alert("暂无数据可导出");
        return;
    }
    
    if (!window.confirm(`确认导出 ${artifacts.length} 条记录的影像资料？这将生成一个按遗址结构整理的 ZIP 包。`)) return;

    const zip = new JSZip();
    let imageCount = 0;
    
    const customRoot = currentUser?.settings?.exportPath || '';
    const rootFolder = customRoot ? zip.folder(customRoot) : zip;

    if (!rootFolder) {
        alert("创建导出目录失败");
        return;
    }

    artifacts.forEach(artifact => {
        const siteFolder = rootFolder.folder(artifact.siteName);
        const unitFolder = siteFolder?.folder(artifact.unit || '无单位');
        
        if (unitFolder && artifact.images) {
            artifact.images.forEach(img => {
                const subFolder = img.type === 'photo' ? '照片' : '线图';
                const folder = unitFolder.folder(subFolder);
                
                if (folder) {
                    const base64Data = img.url.split(',')[1];
                    if (base64Data) {
                        folder.file(img.fileName, base64Data, {base64: true});
                        imageCount++;
                    }
                }
            });
        }
    });

    if (imageCount === 0) {
        alert("记录中没有包含任何影像资料。");
        return;
    }

    try {
        const content = await zip.generateAsync({type:"blob"});
        const url = window.URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ArchaeoLog_Images_${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Zip generation failed", err);
        alert("导出压缩包失败");
    }
  };

  const handleExportFolder = async () => {
    if (artifacts.length === 0) {
        alert("暂无数据可导出");
        return;
    }

    try {
        // @ts-ignore - File System Access API
        const dirHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        
        let count = 0;
        let errorCount = 0;

        for (const artifact of artifacts) {
            if (!artifact.images || artifact.images.length === 0) continue;

            const safeSiteName = artifact.siteName.replace(/[\\/:*?"<>|]/g, "_") || "未命名遗址";
            const siteHandle = await dirHandle.getDirectoryHandle(safeSiteName, { create: true });
            
            const safeUnit = (artifact.unit || '无单位').replace(/[\\/:*?"<>|]/g, "_");
            const unitHandle = await siteHandle.getDirectoryHandle(safeUnit, { create: true });

            for (const img of artifact.images) {
                const subFolderName = img.type === 'photo' ? '照片' : '线图';
                const subFolderHandle = await unitHandle.getDirectoryHandle(subFolderName, { create: true });
                
                try {
                    const response = await fetch(img.url);
                    const blob = await response.blob();
                    
                    // Force JPG extension if missing
                    let fileName = img.fileName;
                    if (!fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) {
                        fileName += '.jpg';
                    }

                    const fileHandle = await subFolderHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    count++;
                } catch (e) {
                    console.error("Write error", e);
                    errorCount++;
                }
            }
        }
        alert(`导出完成！\n成功保存: ${count} 张\n失败: ${errorCount} 张`);

    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            console.error("Directory export failed:", err);
            alert("导出失败，请检查文件夹权限或使用 ZIP 导出。");
        }
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws);
        const imported = data.map((row: any) => ({
          id: generateId(),
          siteName: row['遗址名称'] || '未命名遗址',
          unit: row['探方/单位'] || '',
          layer: row['层位'] || '',
          serialNumber: row['编号'] || '',
          name: row['器物名称'] || '未命名器物',
          category: row['器类'] || '',
          material: row['质地'] || '未知',
          quantity: Number(row['数量']) || 1,
          condition: row['保存状况'] || '未知',
          dimensions: row['尺寸'] || '',
          excavationDate: row['出土日期'] || new Date().toISOString().split('T')[0],
          finder: row['发现者'] || '',
          recorder: row['录入者'] || '',
          description: row['描述'] || '',
          images: [], // New structure for imported data
          createdAt: Date.now()
        }));
        if (window.confirm(`确认导入 ${imported.length} 条记录？`)) {
          setArtifacts(prev => [...imported, ...prev]);
        }
      } catch (error) {
        alert("导入失败");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  // --- Grouping Logic ---

  const groupedSites = useMemo(() => {
    const sites: Record<string, { count: number, latestImage: string | null, lastUpdate: number }> = {};
    artifacts.forEach(art => {
      if (!sites[art.siteName]) {
        sites[art.siteName] = { count: 0, latestImage: null, lastUpdate: 0 };
      }
      sites[art.siteName].count += 1;
      if (art.createdAt > sites[art.siteName].lastUpdate) {
        sites[art.siteName].lastUpdate = art.createdAt;
        sites[art.siteName].latestImage = art.imageUrl || null;
      }
    });
    return Object.entries(sites)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.lastUpdate - a.lastUpdate);
  }, [artifacts]);

  const displayedSites = groupedSites.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const displayedArtifacts = useMemo(() => {
    if (!selectedSite) return [];
    return artifacts
      .filter(a => a.siteName === selectedSite)
      .filter(a => 
         a.name.includes(searchTerm) || 
         a.serialNumber?.includes(searchTerm) ||
         a.material.includes(searchTerm)
      )
      .sort((a, b) => {
        // Sort primarily by Unit/Layer/Number for archaeological order
        const numA = a.serialNumber || '';
        const numB = b.serialNumber || '';
        return numA.localeCompare(numB, undefined, { numeric: true });
      });
  }, [artifacts, selectedSite, searchTerm]);

  // --- Helper Components ---

  const openProfileSettings = () => {
    if (!currentUser) return;
    setProfileForm({
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      settings: currentUser.settings || { autoRenameExport: true, exportPath: '' }
    });
    setProfilePassword({ new: '', confirm: '' });
    setShowProfileModal(true);
    setShowUserMenu(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-stone-200">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-stone-50 p-6 rounded-full mb-4 shadow-inner">
               <AppLogo className="h-16 w-16 text-terra-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">ArchaeoLog</h1>
            <p className="text-stone-500 text-sm mt-2 font-medium">考古发掘出土器物数字档案</p>
          </div>

          <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">档案员账号</label>
              <input 
                type="text" 
                value={loginForm.username} 
                onChange={e => setLoginForm(prev => ({...prev, username: e.target.value}))}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-terra-500/20 bg-stone-50/50 transition-all"
                placeholder="请输入用户名"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">系统口令</label>
              <input 
                type="password" 
                value={loginForm.password} 
                onChange={e => setLoginForm(prev => ({...prev, password: e.target.value}))}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-terra-500/20 bg-stone-50/50 transition-all"
                placeholder="请输入密码"
                required
              />
            </div>
            <button type="submit" className="w-full bg-terra-600 text-white py-3 rounded-lg font-bold hover:bg-terra-700 transition-all shadow-md active:scale-[0.98]">
              {isLoginMode ? '进入系统' : '建立档案员身份'}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-stone-100 pt-6">
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm font-medium text-stone-400 hover:text-terra-600 transition-colors">
              {isLoginMode ? '还没有系统身份？立即建立' : '已有身份？返回入口登录'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-800">
      <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-stone-900 text-stone-50 shadow-lg border-b-4 border-terra-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo className="h-7 w-7 text-terra-500" />
            <h1 className="text-lg sm:text-xl font-serif font-bold tracking-wide flex items-baseline">
              ArchaeoLog 
              <span className="text-stone-400 text-[10px] sm:text-xs font-normal ml-3 hidden sm:inline-block tracking-widest uppercase">
                考古发掘出土器物数字档案
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-lg text-xs transition-colors border border-stone-700">
                <Upload size={14} />导入
              </button>
               {/* Global Export Dropdown */}
               <div className="group relative">
                    <button className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-lg text-xs transition-colors border border-stone-700">
                        <Download size={14} /> 备份
                    </button>
                    <div className="absolute right-0 mt-1 w-40 bg-stone-800 border border-stone-700 rounded-lg shadow-xl py-1 text-stone-300 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                        <button onClick={handleExportExcel} className="w-full text-left px-3 py-2 text-xs hover:bg-stone-700 flex items-center gap-2">
                            <Layers size={14} /> 全部数据 (.xlsx)
                        </button>
                         <button onClick={handleExportZip} className="w-full text-left px-3 py-2 text-xs hover:bg-stone-700 flex items-center gap-2">
                            <FolderOpen size={14} /> 影像压缩包 (.zip)
                        </button>
                        {/* Conditional Rendering for Directory Picker Support */}
                        {'showDirectoryPicker' in window && (
                           <button onClick={handleExportFolder} className="w-full text-left px-3 py-2 text-xs hover:bg-stone-700 flex items-center gap-2 text-terra-400 font-bold border-t border-stone-700 mt-1">
                                <HardDrive size={14} /> 导出到本地文件夹
                            </button>
                        )}
                    </div>
               </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 hover:bg-stone-800 rounded-full transition-colors group border border-transparent hover:border-stone-700"
              >
                <span className="hidden sm:inline text-xs font-bold text-stone-300 group-hover:text-white max-w-[100px] truncate">
                  {currentUser.displayName}
                </span>
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} className="h-8 w-8 rounded-full border border-stone-700 object-cover bg-white shadow-sm" alt="Avatar" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-terra-500 flex items-center justify-center text-white font-bold border border-stone-700 shadow-sm">
                    {currentUser.displayName[0].toUpperCase()}
                  </div>
                )}
                <ChevronDown size={14} className={`text-stone-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-[-1]" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-2xl border border-stone-200 py-2 text-stone-700 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-stone-100 mb-1">
                      <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">认证档案员</p>
                      <p className="text-sm font-bold truncate text-stone-900">{currentUser.username}</p>
                    </div>
                    <button 
                      onClick={openProfileSettings}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2 text-sm transition-colors group"
                    >
                      <UserCircle size={16} className="text-stone-400 group-hover:text-terra-600" /> 身份设置
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm transition-colors group">
                      <LogOut size={16} className="text-red-400 group-hover:text-red-600" /> 移交工作 (登出)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation / Toolbar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full group flex items-center gap-4">
            {selectedSite && (
                <button 
                    onClick={() => { setSelectedSite(null); setSearchTerm(''); }}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-stone-200 hover:bg-stone-50 hover:border-terra-300 text-stone-500 hover:text-terra-600 transition-all shadow-sm shrink-0"
                    title="返回遗址库"
                >
                    <ArrowLeft size={20} />
                </button>
            )}
            
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-terra-500 transition-colors" />
                <input 
                type="text" 
                placeholder={selectedSite ? `在 ${selectedSite} 中检索器物...` : "检索遗址名称..."} 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-2xl bg-white focus:ring-4 focus:ring-terra-500/10 focus:border-terra-500 transition-all shadow-sm outline-none" 
                />
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             {selectedSite && (
                 <div className="flex bg-white rounded-lg p-1 border border-stone-200 shadow-sm mr-2">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-stone-100 text-terra-600' : 'text-stone-400 hover:text-stone-600'}`}
                        title="网格视图"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-stone-100 text-terra-600' : 'text-stone-400 hover:text-stone-600'}`}
                        title="列表视图"
                    >
                        <ListIcon size={18} />
                    </button>
                 </div>
             )}
             
             {selectedSite && (
                  <button 
                    onClick={() => handleExportSiteExcel(selectedSite)}
                    className="flex items-center justify-center gap-2 bg-stone-200 hover:bg-stone-300 text-stone-700 px-4 py-3 rounded-xl font-bold transition-all text-sm shrink-0"
                    title="导出本遗址 Excel"
                  >
                    <FileSpreadsheet size={18} /> <span className="hidden sm:inline">导出遗址数据</span>
                  </button>
             )}

             <button onClick={() => setShowForm(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-terra-600 hover:bg-terra-500 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg active:scale-95 shrink-0">
                <Plus size={20} /> <span className="hidden sm:inline">新增登记</span><span className="sm:hidden">新增</span>
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Mode 1: Site Selection (Home) */}
            {!selectedSite && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {displayedSites.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200">
                             <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <MapPin className="h-10 w-10 text-stone-300" />
                             </div>
                             <p className="text-stone-400 font-serif italic text-lg">
                                {artifacts.length === 0 ? "尚未登记任何文物" : "未找到匹配的遗址"}
                             </p>
                        </div>
                    ) : (
                        displayedSites.map(site => (
                            <div 
                                key={site.name} 
                                onClick={() => { setSelectedSite(site.name); setSearchTerm(''); }}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 hover:border-terra-300 hover:shadow-lg transition-all cursor-pointer group flex items-start gap-4"
                            >
                                <div className="w-24 h-24 rounded-xl bg-stone-100 shrink-0 overflow-hidden relative">
                                    {site.latestImage ? (
                                        <img src={site.latestImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                                            <FolderOpen size={32} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 py-1">
                                    <h3 className="text-lg font-bold text-stone-800 font-serif mb-1 group-hover:text-terra-700 transition-colors">{site.name}</h3>
                                    <p className="text-xs text-stone-500 mb-3">上次更新: {new Date(site.lastUpdate).toLocaleDateString()}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                            <Layers size={12} /> {site.count} 件
                                        </span>
                                    </div>
                                </div>
                                <div className="h-full flex items-center text-stone-300 group-hover:text-terra-500 transition-colors">
                                    <ChevronDown className="-rotate-90" size={20} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Mode 2: Artifact List (Inside Site) */}
            {selectedSite && (
                <>
                    <div className="bg-white px-6 py-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                        <h2 className="text-xl font-bold font-serif text-stone-800 flex items-center gap-2">
                            <MapPin className="text-terra-600" size={20}/> {selectedSite}
                        </h2>
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{displayedArtifacts.length} RECORDS</span>
                    </div>

                    {displayedArtifacts.length === 0 ? (
                         <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200">
                            <p className="text-stone-400 font-serif italic">未找到匹配的器物</p>
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? "space-y-5" : "space-y-3"}>
                            {displayedArtifacts.map((item) => (
                                viewMode === 'grid' ? (
                                    // GRID CARD STYLE
                                    <div 
                                        key={item.id} 
                                        onClick={() => setViewingArtifact(item)}
                                        className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col sm:row-span-1 sm:flex-row min-h-[180px] group cursor-pointer"
                                    >
                                        <div className="w-full sm:w-48 bg-stone-100 relative shrink-0 overflow-hidden">
                                            {item.imageUrl ? (
                                            <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                                            ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 bg-stone-100/30">
                                                <AppLogo className="h-10 w-10 mb-2 opacity-10" />
                                            </div>
                                            )}
                                            <div className="absolute top-2 left-2">
                                                {(item.images?.length || 0) > 1 && (
                                                    <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-md font-bold border border-white/10 flex items-center gap-1">
                                                        <Camera size={10} /> {item.images?.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="mb-2">
                                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">
                                                        {item.unit ? (
                                                            <span className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                                                                <Hash size={10} /> {item.unit}
                                                            </span>
                                                        ) : <span className="text-stone-300">无单位</span>}
                                                        {item.layer && <span className="text-stone-300">|</span>}
                                                        {item.layer && <span>{item.layer}</span>}
                                                    </div>
                                                    
                                                    <div className="flex items-baseline gap-2 flex-wrap">
                                                        {item.serialNumber && (
                                                            <span className="font-mono text-lg font-bold text-terra-700 tracking-tight">
                                                                {item.serialNumber}
                                                            </span>
                                                        )}
                                                        <h3 className="text-xl font-serif font-bold text-stone-900 leading-none">
                                                            {item.name}
                                                        </h3>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {item.category && <span className="text-[10px] px-2 py-0.5 bg-terra-50 text-terra-800 rounded border border-terra-100 font-bold">{item.category}</span>}
                                                    <span className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-600 rounded border border-stone-200">{item.material}</span>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex justify-between items-end border-t border-stone-50 pt-3">
                                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                                                    {item.excavationDate}
                                                </span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-2 text-stone-400 hover:text-terra-600 hover:bg-terra-50 rounded-lg"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => handleDelete(e, item.id)} className={`p-2 rounded-lg ${confirmDeleteId === item.id ? "bg-red-600 text-white" : "text-stone-300 hover:text-red-600 hover:bg-red-50"}`}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // LIST ROW STYLE
                                    <div 
                                        key={item.id} 
                                        onClick={() => setViewingArtifact(item)}
                                        className="bg-white rounded-xl p-2 shadow-sm border border-stone-200 hover:border-terra-300 hover:shadow-md transition-all cursor-pointer group flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-stone-100 shrink-0 overflow-hidden">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} className="w-full h-full object-cover" alt="thumb" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-stone-300"><AppLogo size={16}/></div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                                            <div className="min-w-0">
                                                <div className="text-[10px] text-stone-400 font-bold uppercase">{item.unit || '-'} / {item.layer || '-'}</div>
                                                <div className="font-mono text-sm font-bold text-terra-700 truncate">{item.serialNumber || '无编号'}</div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-serif font-bold text-stone-900 truncate">{item.name}</div>
                                                <div className="text-[10px] text-stone-500 truncate">{item.material} · {item.category}</div>
                                            </div>
                                            <div className="hidden sm:block text-[10px] text-stone-400 truncate">
                                                {item.condition}
                                            </div>
                                            <div className="hidden sm:block text-[10px] text-stone-400 font-mono text-right">
                                                {item.excavationDate}
                                            </div>
                                        </div>

                                        <div className="flex gap-1 pr-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1.5 text-stone-400 hover:text-terra-600 hover:bg-terra-50 rounded-lg"><Edit2 size={14} /></button>
                                            <button onClick={(e) => handleDelete(e, item.id)} className={`p-1.5 rounded-lg ${confirmDeleteId === item.id ? "bg-red-600 text-white" : "text-stone-300 hover:text-red-600 hover:bg-red-50"}`}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </>
            )}
          </div>
          
          {/* Sidebar / Stats */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
               <h3 className="font-serif font-bold text-stone-800 mb-6 flex items-center gap-2"><Activity size={20} className="text-terra-600"/> 数据分析面板</h3>
               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-stone-50/50 p-5 rounded-2xl border border-stone-100 text-center shadow-sm">
                    <div className="text-3xl font-bold text-stone-900">{artifacts.length}</div>
                    <div className="text-[10px] text-stone-400 uppercase font-black tracking-widest mt-2">在册器物</div>
                  </div>
                   <div className="bg-stone-50/50 p-5 rounded-2xl border border-stone-100 text-center shadow-sm">
                    <div className="text-3xl font-bold text-stone-900">{groupedSites.length}</div>
                    <div className="text-[10px] text-stone-400 uppercase font-black tracking-widest mt-2">遗址总数</div>
                  </div>
               </div>
               {/* Pass filtered data to chart if a site is selected, else all */}
               <StatsChart artifacts={selectedSite ? displayedArtifacts : artifacts} />
            </div>
            
            <div className="bg-stone-900 text-stone-50 p-8 rounded-3xl shadow-2xl relative overflow-hidden border-b-8 border-terra-600">
               <div className="relative z-10">
                 <h4 className="font-serif font-bold text-xl mb-4 text-terra-500">数字化出土文档</h4>
                 <p className="text-xs text-stone-400 leading-relaxed mb-6 font-serif italic">
                   "考古发掘是对人类文明碎片的重构。ArchaeoLog 致力于将每一次铲尖的发现，转化为永恒的数字印记。"
                 </p>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-terra-700">
                    <AppLogo className="h-4 w-4" /> Professional Archive
                 </div>
               </div>
               <AppLogo className="absolute -bottom-6 -right-6 h-32 w-32 text-stone-800 opacity-40 transform -rotate-[25deg]" />
            </div>
          </div>
        </div>
      </main>

      {/* Forms & Modals */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl my-auto animate-in zoom-in-95 duration-300">
             <ArtifactForm initialData={editingArtifact} onSave={handleSave} onCancel={() => {setShowForm(false); setEditingArtifact(null);}} />
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingArtifact && (
        <ArtifactDetails 
            artifact={viewingArtifact} 
            onClose={() => setViewingArtifact(null)} 
            onEdit={() => {
                setViewingArtifact(null);
                handleEdit(viewingArtifact);
            }}
        />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-stone-200 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8 border-b border-stone-100 pb-5">
              <h2 className="text-2xl font-serif font-bold text-stone-800">档案员身份设置</h2>
              <button onClick={() => setShowProfileModal(false)} className="text-stone-300 hover:text-stone-900 p-2 rounded-full transition-all hover:bg-stone-50"><X size={24}/></button>
            </div>
            <form onSubmit={updateProfile} className="space-y-6">
              <div className="flex flex-col items-center gap-4 mb-6">
                 {/* 关键修改：将 input 绝对定位覆盖整个头像区域，确保点击 100% 触发 */}
                 <div className="relative group w-28 h-28 mx-auto">
                    {/* 底层头像显示 */}
                    <div className="w-full h-full rounded-full overflow-hidden relative">
                        {profileForm.avatarUrl ? (
                          <img src={profileForm.avatarUrl} className="w-full h-full object-cover border-4 border-terra-500 shadow-xl transition-transform group-hover:scale-105" alt="Avatar Preview" />
                        ) : (
                          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300 border-2 border-dashed border-stone-200 transition-all group-hover:bg-stone-200 shadow-inner">
                            <UserIcon size={48} />
                          </div>
                        )}
                        {/* 视觉覆盖层：相机图标 */}
                        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/60 text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none backdrop-blur-sm">
                           <Camera size={24} />
                        </div>
                    </div>
                    
                    {/* 功能覆盖层：透明的文件输入框，z-index 设高，确保最顶层 */}
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        title="点击更换头像"
                    />
                 </div>
                 
                 <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">更换身份头像 (建议方图)</span>
              </div>
              
              <div>
                <label className="block text-xs font-black text-stone-500 mb-2 uppercase tracking-widest">系统显示名</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
                  <input 
                    type="text" 
                    value={profileForm.displayName} 
                    onChange={e => setProfileForm(prev => ({...prev, displayName: e.target.value}))}
                    className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-4 focus:ring-terra-500/10 focus:border-terra-500 bg-stone-50/50 text-sm font-bold"
                    placeholder="请输入显示昵称"
                  />
                </div>
              </div>

               {/* Setting Option */}
               <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-4">
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-stone-600">
                        <FolderOpen size={16} />
                        <span className="text-sm font-bold">启用自动归档重命名</span>
                     </div>
                     <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input 
                            type="checkbox" 
                            name="toggle" 
                            id="toggle" 
                            checked={profileForm.settings?.autoRenameExport}
                            onChange={(e) => setProfileForm(prev => ({...prev, settings: {...prev.settings, autoRenameExport: e.target.checked}}))}
                            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5 transition-all duration-300 border-stone-300 checked:border-terra-600"
                        />
                        <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-300 ${profileForm.settings?.autoRenameExport ? 'bg-terra-600' : 'bg-stone-300'}`}></label>
                    </div>
                 </div>
                 
                 {/* NEW Export Path Input - Clarified context as ZIP root */}
                 <div className="space-y-1 pt-2 border-t border-stone-200/50">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">ZIP 归档根目录名称</label>
                    <div className="relative">
                      <FolderInput size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
                      <input 
                        type="text" 
                        value={profileForm.settings?.exportPath || ''}
                        onChange={(e) => setProfileForm(prev => ({...prev, settings: {...prev.settings, exportPath: e.target.value}}))}
                        className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-terra-500/10 focus:border-terra-500 bg-white text-xs font-mono text-stone-600"
                        placeholder="例如：2024年度发掘/资料汇总"
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 italic">* 仅用于ZIP下载。若使用“导出到本地文件夹”，则直接保存到所选目录。</p>
                 </div>
              </div>

              <div className="pt-6 border-t border-stone-100 space-y-4">
                <label className="block text-xs font-black text-stone-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                  <Key size={14} className="text-terra-600"/> 安全重置选项
                </label>
                <p className="text-[10px] text-stone-400 italic">若不打算重设系统口令，请保持以下留空。</p>
                <input 
                  type="password" 
                  placeholder="新系统口令"
                  value={profilePassword.new} 
                  onChange={e => setProfilePassword(prev => ({...prev, new: e.target.value}))}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-4 focus:ring-terra-500/10 focus:border-terra-500 bg-stone-50/50 text-sm"
                />
                <input 
                  type="password" 
                  placeholder="再次确认口令"
                  value={profilePassword.confirm} 
                  onChange={e => setProfilePassword(prev => ({...prev, confirm: e.target.value}))}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl outline-none focus:ring-4 focus:ring-terra-500/10 focus:border-terra-500 bg-stone-50/50 text-sm"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-bold text-stone-500 border border-stone-200 rounded-xl hover:bg-stone-50 transition-all"
                >
                  放弃修改
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-xl active:scale-[0.98] text-sm"
                >
                  同步保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
