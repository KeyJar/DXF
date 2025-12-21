
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Database, Trash2, Edit2, Hash, Camera, LayoutGrid, Box, LogOut, Download, Upload, FileSpreadsheet, Menu, X, Save, User as UserIcon, Folder, ChevronRight, Activity, PieChart, Layers, Settings, Lock, Image as ImageIcon, Info, FileText, Server, UserCog, History, Github } from 'lucide-react';
import * as XLSX from 'xlsx';
import StatsChart from './StatsChart';
import ArtifactForm from './ArtifactForm';
import ArtifactDetails from './ArtifactDetails';
import LoginScreen from './LoginScreen';
import { Artifact, User } from '../types';
import { api } from '../services/api';

// Simple Logo Component - Sharper Tip, Smooth Handle, Tilted 45 Degrees
const AppLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <g transform="rotate(45 12 12)">
        <path d="M12 24L7.5 13H11V11H10.5V2.5C10.5 1.67 11.17 1 12 1C12.83 1 13.5 1.67 13.5 2.5V11H13V13H16.5L12 24Z" />
    </g>
  </svg>
);

// Image Compression Helper
const compressImage = (file: File, maxWidth = 512): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
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
           if (height > maxWidth) { 
             width *= maxWidth / height;
             height = maxWidth;
           }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const App: React.FC = () => {
  // --- Data State ---
  const [user, setUser] = useState<User | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'data' | 'profile' | 'about' | 'changelog'>('data');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- Mobile State ---
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Profile Edit State ---
  const [previewAvatar, setPreviewAvatar] = useState('');
  
  // --- View State ---
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string | null>(null);
  
  // --- UI Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    const init = async () => {
        try {
            const savedUser = localStorage.getItem('archaeo_current_user');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
                // Load artifacts from server if user is logged in
                await loadArtifacts();
            }
        } catch (e) {
            console.error("Failed to load initial data", e);
        }
    };
    init();
  }, []);

  // Update preview when opening profile inside settings
  useEffect(() => {
    if (showSettings && user) {
        setPreviewAvatar(user.avatarUrl);
    }
  }, [showSettings, user]);

  const loadArtifacts = async () => {
      try {
          const data = await api.getArtifacts();
          setArtifacts(data);
          localStorage.setItem('artifacts', JSON.stringify(data)); 
      } catch (err) {
          console.error("Failed to fetch artifacts", err);
          const savedData = localStorage.getItem('artifacts');
          if (savedData) setArtifacts(JSON.parse(savedData));
      }
  }

  const handleLogin = async (userData: User) => {
    setUser(userData);
    localStorage.setItem('archaeo_current_user', JSON.stringify(userData));
    await loadArtifacts();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('archaeo_current_user');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const base64 = await compressImage(file);
              setPreviewAvatar(base64);
          } catch (err) {
              alert("图片处理失败");
          }
      }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const newPassword = formData.get('newPassword') as string;

    const updatedData: any = { username: user.username, displayName, avatarUrl: previewAvatar };
    if (newPassword) updatedData.newPassword = newPassword;

    try {
        const updatedUser = await api.updateProfile(updatedData);
        setUser(updatedUser);
        localStorage.setItem('archaeo_current_user', JSON.stringify(updatedUser));
        alert('个人信息已更新');
    } catch(err) {
        console.error("Update failed", err);
        alert("更新失败");
    }
  };

  const handleSave = async (data: Omit<Artifact, 'id' | 'createdAt'>) => {
    if (isEditing && selectedId) {
      const currentArtifact = artifacts.find(a => a.id === selectedId);
      if (currentArtifact) {
        const updatedArtifact = { ...data, id: selectedId, createdAt: currentArtifact.createdAt } as Artifact;
        try {
            await api.saveArtifact(updatedArtifact);
            setArtifacts(prev => prev.map(a => a.id === selectedId ? updatedArtifact : a));
            setIsEditing(false);
            setShowForm(false);
        } catch (err) {
            alert("保存失败");
        }
      }
    } else {
      const newArtifact: Artifact = {
        ...data,
        id: Date.now().toString(),
        createdAt: Date.now()
      };
      try {
          await api.saveArtifact(newArtifact);
          setArtifacts(prev => [newArtifact, ...prev]);
          setShowForm(false);
          setSelectedId(null); 
      } catch(err) {
          alert("保存失败");
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (window.confirm('确定要删除这条记录吗？此操作不可恢复。')) {
      try {
          await api.deleteArtifact(id);
          setArtifacts(prev => prev.filter(a => a.id !== id));
          if (selectedId === id) setSelectedId(null);
      } catch (err) {
          alert("删除失败");
      }
    }
  };

  // --- Excel Import / Export ---
  const handleExportExcel = () => {
     const data = artifacts.map(item => ({
       '遗址名称': item.siteName,
       '单位': item.unit,
       '层位': item.layer,
       '编号': item.serialNumber,
       '名称': item.name,
       '器类': item.category,
       '质地': item.material,
       '数量': item.quantity,
       '保存状况': item.condition,
       '尺寸': item.dimensions,
       '出土日期': item.excavationDate,
       '备注': item.remarks,
       '详细描述': item.description,
       '发现者': item.finder,
       '录入者': item.recorder,
     }));
     const ws = XLSX.utils.json_to_sheet(data);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Artifacts");
     XLSX.writeFile(wb, `考古文物记录_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleImportExcelTrigger = () => {
     excelInputRef.current?.click();
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = new Uint8Array(event.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
              
              const newArtifacts: Artifact[] = jsonData.map((row: any) => ({
                 id: Date.now().toString() + Math.random(),
                 createdAt: Date.now(),
                 siteName: row['遗址名称'] || '未命名遗址',
                 unit: row['单位'],
                 layer: row['层位'],
                 serialNumber: row['编号'],
                 name: row['名称'] || '未命名器物',
                 category: row['器类'],
                 material: row['质地'],
                 quantity: Number(row['数量']) || 1,
                 condition: row['保存状况'],
                 dimensions: row['尺寸'],
                 excavationDate: row['出土日期'],
                 remarks: row['备注'],
                 description: row['详细描述'] || row['描述'],
                 finder: row['发现者'],
                 recorder: row['录入者'],
                 images: [], 
                 imageUrl: '' 
              }));

              if (newArtifacts.length > 0) {
                 if (window.confirm(`解析成功，准备导入 ${newArtifacts.length} 条数据。是否继续？`)) {
                     setLoading(true);
                     for (const art of newArtifacts) {
                         await api.saveArtifact(art);
                     }
                     await loadArtifacts();
                     setLoading(false);
                     alert("导入完成");
                 }
              } else {
                  alert("未在表格中发现有效数据");
              }
          } catch (err) {
              console.error(err);
              alert("Excel 解析失败，请检查文件格式");
              setLoading(false);
          }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
  };

  const handleImportJSONTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
           if(window.confirm(`发现 ${json.length} 条记录。确定要覆盖当前数据吗？`)) {
             setLoading(true);
             for (const art of json) {
                 await api.saveArtifact(art);
             }
             await loadArtifacts();
             setLoading(false);
             alert('数据导入成功！');
           }
        } else {
          alert('文件格式错误');
        }
      } catch (err) { alert('文件解析失败'); setLoading(false); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(artifacts, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archaeolog_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Derived Data for Dashboard ---
  const siteGroups = useMemo(() => {
    const groups: Record<string, { count: number, lastUpdate: number, image?: string }> = {};
    artifacts.forEach(a => {
        const site = a.siteName || '未分类遗址';
        if (!groups[site]) {
            groups[site] = { count: 0, lastUpdate: 0 };
        }
        groups[site].count += 1;
        if (a.createdAt > groups[site].lastUpdate) {
            groups[site].lastUpdate = a.createdAt;
        }
        if (!groups[site].image && a.imageUrl) {
            groups[site].image = a.imageUrl;
        } else if (a.imageUrl && a.createdAt > groups[site].lastUpdate) {
             groups[site].image = a.imageUrl;
        }
    });
    return Object.entries(groups).map(([name, data]) => ({
        name,
        ...data,
        formattedDate: new Date(data.lastUpdate).toLocaleDateString()
    })).sort((a, b) => b.lastUpdate - a.lastUpdate);
  }, [artifacts]);

  const filteredArtifacts = useMemo(() => {
    let result = artifacts;
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(a => 
            a.name.toLowerCase().includes(lower) || 
            (a.siteName && a.siteName.toLowerCase().includes(lower)) ||
            (a.serialNumber && a.serialNumber.toLowerCase().includes(lower))
        );
    }
    if (selectedSiteFilter) {
        result = result.filter(a => (a.siteName || '未分类遗址') === selectedSiteFilter);
    }
    return result;
  }, [artifacts, searchTerm, selectedSiteFilter]);

  const selectedArtifact = useMemo(() => 
    artifacts.find(a => a.id === selectedId), 
  [artifacts, selectedId]);

  // --- Mobile Menu Component ---
  const MobileMenu = () => (
     <div className="fixed inset-0 z-[100] bg-stone-900/95 backdrop-blur-xl p-6 flex flex-col animate-in slide-in-from-right duration-200 md:hidden">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-terra-600 to-terra-700 p-2 rounded-lg text-white shadow-lg shadow-terra-900/20">
                 <AppLogo className="w-6 h-6" />
              </div>
              <span className="text-white font-serif font-bold text-lg tracking-wide">功能菜单</span>
           </div>
           <button onClick={() => setMobileMenuOpen(false)} className="text-stone-400 hover:text-white p-2 bg-stone-800 rounded-full border border-stone-700">
              <X size={20} />
           </button>
        </div>

        {/* User Info Card */}
        <div 
            onClick={() => { setShowSettings(true); setSettingsTab('profile'); setMobileMenuOpen(false); }}
            className="bg-stone-800 p-4 rounded-2xl flex items-center gap-4 border border-stone-700 mb-6 active:scale-98 transition-transform"
        >
             <div className="relative">
                <img src={user?.avatarUrl} className="w-12 h-12 rounded-full border-2 border-stone-600 object-cover" alt="User" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-stone-800 rounded-full"></div>
             </div>
             <div>
                <div className="text-stone-100 font-bold text-lg">{user?.displayName}</div>
                <div className="text-stone-500 text-xs font-mono">@{user?.username}</div>
             </div>
             <div className="ml-auto bg-stone-700 p-2 rounded-full text-stone-400">
                <Settings size={16} />
             </div>
        </div>

        <div className="flex-1 space-y-3">
             <h3 className="text-stone-500 text-xs font-bold uppercase tracking-widest px-1">快捷操作</h3>
             <div className="grid grid-cols-1 gap-3">
                 <button 
                    onClick={() => { setShowSettings(true); setSettingsTab('data'); setMobileMenuOpen(false); }}
                    className="flex items-center gap-4 bg-stone-800/50 p-4 rounded-2xl text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-700/50 active:bg-stone-700 transition-colors"
                 >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <Database size={20} />
                    </div>
                    <span className="text-sm font-bold">数据管理 (导入/导出)</span>
                 </button>
                 <button 
                     onClick={() => { setShowSettings(true); setSettingsTab('about'); setMobileMenuOpen(false); }}
                    className="flex items-center gap-4 bg-stone-800/50 p-4 rounded-2xl text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-700/50 active:bg-stone-700 transition-colors"
                 >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Info size={20} />
                    </div>
                    <span className="text-sm font-bold">关于应用</span>
                 </button>
             </div>
        </div>

        <button 
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            className="w-full py-4 bg-stone-800 text-red-400 font-bold rounded-2xl border border-stone-700 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center gap-2 mt-auto transition-all active:scale-95"
        >
           <LogOut size={20} /> 退出登录
        </button>
     </div>
  );

  if (!user) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans">
       
       {/* Hidden Inputs for File Actions (Always Rendered for Access) */}
       <input type="file" ref={excelInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
       <input type="file" ref={fileInputRef} onChange={handleImportJSON} className="hidden" accept=".json" />

       {/* --- Top Header --- */}
       <header className="bg-stone-900/95 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 transition-all duration-300 shadow-xl shadow-black/20">
           <div className="max-w-[1800px] mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
             
             {/* Left: Brand Identity */}
             <div 
                className="flex items-center gap-3 md:gap-4 cursor-pointer group select-none shrink-0" 
                onClick={() => setSelectedSiteFilter(null)}
             >
               <div className="relative">
                  <div className="absolute inset-0 bg-terra-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full duration-500"></div>
                  <div className="bg-gradient-to-br from-terra-600 to-terra-700 text-white p-2 rounded-xl shadow-lg shadow-black/20 border border-white/10 relative transform group-hover:scale-105 transition-transform duration-300">
                    <AppLogo className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
               </div>
               <div className="flex flex-col justify-center">
                  <h1 className="text-base md:text-xl font-serif font-bold text-stone-100 tracking-wide leading-none group-hover:text-white transition-colors">
                     ArchaeoLog
                  </h1>
                  <span className="text-[10px] font-bold text-stone-500 tracking-wider mt-1 hidden md:block">
                     考古出土器物数字档案
                  </span>
               </div>
             </div>
             
             {/* Right: Actions Toolbar (Desktop) */}
             <div className="hidden md:flex items-center gap-6">
               
               {/* Simplified Settings Access */}
               <button 
                 onClick={() => { setShowSettings(true); setSettingsTab('data'); }}
                 className="p-2.5 text-stone-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                 title="设置"
               >
                 <Settings size={20} />
               </button>
               
               {/* Divider */}
               <div className="h-8 w-px bg-gradient-to-b from-transparent via-stone-700 to-transparent mx-2"></div>

               {/* User Profile Trigger */}
               <div className="flex items-center gap-4">
                   <div 
                      className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-full cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group select-none" 
                      onClick={() => { setShowSettings(true); setSettingsTab('profile'); }}
                      title="个人中心"
                   >
                      <div className="text-right">
                          <div className="text-xs font-bold text-stone-300 group-hover:text-white transition-colors leading-tight">{user.displayName}</div>
                          <div className="text-[9px] text-stone-600 font-mono group-hover:text-terra-500 transition-colors leading-tight mt-0.5">@{user.username}</div>
                      </div>
                      <div className="relative">
                          <img src={user.avatarUrl} className="w-9 h-9 rounded-full border-2 border-stone-800 group-hover:border-terra-500/50 transition-colors object-cover shadow-lg" alt="User" />
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-stone-900 rounded-full"></div>
                      </div>
                   </div>
                   
                   <button 
                        onClick={handleLogout} 
                        className="p-2.5 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all border border-transparent hover:border-red-500/20"
                        title="退出登录"
                   >
                       <LogOut size={18} />
                   </button>
               </div>
             </div>

             {/* Right: Mobile/Tablet Actions */}
             <div className="flex md:hidden items-center gap-4">
                <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="text-stone-300 hover:text-white bg-stone-800/80 p-2.5 rounded-xl border border-stone-700 transition-colors active:bg-stone-700 active:scale-95"
                >
                    <Menu size={22} />
                </button>
             </div>

           </div>
       </header>

       {/* Mobile Menu Overlay */}
       {mobileMenuOpen && <MobileMenu />}

       {/* --- Main Content --- */}
       <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
          
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 md:mb-8 justify-between items-start md:items-center">
             <div className="relative w-full max-w-3xl order-2 md:order-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="检索遗址、器物名称或编号..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 md:py-4 bg-white rounded-xl shadow-sm border border-stone-200 focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none text-stone-700 placeholder:text-stone-400 text-base md:text-lg transition-all"
                />
             </div>
             
             {/* New Registration Button Only */}
             <div className="flex items-center gap-3 w-full md:w-auto order-1 md:order-2">
                 <button 
                    onClick={() => { setIsEditing(false); setSelectedId(null); setShowForm(true); }}
                    className="w-full md:w-auto px-8 py-3.5 bg-terra-600 hover:bg-terra-700 text-white rounded-full font-bold shadow-lg shadow-terra-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                 >
                    <Plus size={20} /> <span className="whitespace-nowrap">新增登记</span>
                 </button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* --- Left Column: Dashboard or List --- */}
              <div className="lg:col-span-8 space-y-6">
                 
                 {/* Breadcrumb if filtered */}
                 {selectedSiteFilter && (
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setSelectedSiteFilter(null)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">首页</button>
                        <ChevronRight size={14} className="text-stone-300" />
                        <span className="font-bold text-stone-800 text-sm">{selectedSiteFilter}</span>
                        <span className="bg-stone-200 text-stone-600 text-[10px] px-2 py-0.5 rounded-full">{filteredArtifacts.length}</span>
                    </div>
                 )}

                 {loading ? (
                     <div className="py-20 flex justify-center text-stone-400 gap-2">
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-terra-500"></div> 加载中...
                     </div>
                 ) : (
                     /* MODE A: Dashboard (Site Cards) */
                     !selectedSiteFilter && !searchTerm ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {siteGroups.map(site => (
                                <div 
                                    key={site.name}
                                    onClick={() => setSelectedSiteFilter(site.name)}
                                    className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:shadow-md hover:border-terra-200 transition-all cursor-pointer group flex items-center gap-4"
                                >
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-stone-100 shrink-0 overflow-hidden border border-stone-100 group-hover:border-terra-100 transition-colors">
                                        {site.image ? (
                                            <img src={site.image} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                <Folder size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base md:text-lg font-serif font-bold text-stone-800 mb-1 truncate group-hover:text-terra-700 transition-colors">{site.name}</h3>
                                        <div className="text-xs text-stone-400 mb-2">更新: {site.formattedDate}</div>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 text-[10px] md:text-xs font-bold gap-1 group-hover:bg-terra-50 group-hover:text-terra-700 transition-colors">
                                            <Layers size={12} /> {site.count} 件
                                        </span>
                                    </div>
                                    <div className="pr-2 text-stone-300 group-hover:translate-x-1 transition-transform group-hover:text-terra-400">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            ))}
                            {siteGroups.length === 0 && (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-stone-400 bg-white rounded-2xl border border-dashed border-stone-200">
                                    <Box size={40} className="mb-4 opacity-20" />
                                    <p>暂无记录，请点击右上角新增登记</p>
                                </div>
                            )}
                         </div>
                     ) : (
                         /* MODE B: Artifact List */
                         <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden min-h-[500px]">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                              <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 font-medium">
                                <tr>
                                  <th className="px-4 py-3 pl-6">文物信息</th>
                                  <th className="px-4 py-3 hidden md:table-cell">遗址/单位</th>
                                  <th className="px-4 py-3 hidden md:table-cell">质地/器类</th>
                                  <th className="px-4 py-3 text-right pr-6">操作</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                {filteredArtifacts.map(item => (
                                  <tr key={item.id} className="hover:bg-stone-50/50 group transition-colors">
                                    <td className="px-4 py-3 pl-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 cursor-pointer" onClick={() => setSelectedId(item.id)}>
                                          {item.imageUrl ? (
                                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                                              <Box size={16} />
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-bold text-stone-800 font-serif cursor-pointer hover:text-terra-600 truncate max-w-[120px] md:max-w-none" onClick={() => setSelectedId(item.id)}>{item.name}</div>
                                          <div className="text-xs text-stone-400 font-mono">{item.serialNumber || '无编号'}</div>
                                          {/* Mobile Only Metadata */}
                                          <div className="md:hidden text-[10px] text-stone-500 mt-0.5">{item.siteName} · {item.material}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-stone-600 hidden md:table-cell">
                                      <div className="font-medium">{item.siteName}</div>
                                      <div className="text-xs text-stone-400">{item.unit}</div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                                        {item.material} · {item.category}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right pr-6">
                                      <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => setSelectedId(item.id)}
                                          className="p-1.5 text-stone-400 hover:text-terra-600 hover:bg-terra-50 rounded transition-colors"
                                          title="查看详情"
                                        >
                                          <Database size={16} />
                                        </button>
                                        <button 
                                          onClick={() => { setIsEditing(true); setSelectedId(item.id); setShowForm(true); }}
                                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                                          title="编辑"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        <button 
                                          onClick={(e) => handleDelete(e, item.id)}
                                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="删除"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                            {filteredArtifacts.length === 0 && (
                                <div className="py-20 text-center text-stone-400 flex flex-col items-center">
                                    <Box size={40} className="mb-2 opacity-20" />
                                    暂无匹配数据
                                </div>
                            )}
                         </div>
                     )
                 )}
              </div>

              {/* --- Right Column: Sidebar --- */}
              <div className="lg:col-span-4 space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-2">
                          <span className="text-4xl font-bold text-stone-900 font-sans">{artifacts.length}</span>
                          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">在册器物</span>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-2">
                          <span className="text-4xl font-bold text-stone-900 font-sans">{siteGroups.length}</span>
                          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">遗址总数</span>
                      </div>
                  </div>

                  {/* Chart Card */}
                  <StatsChart artifacts={artifacts} />

                  {/* Promo Card */}
                  <div className="bg-stone-900 rounded-3xl p-8 text-center relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-terra-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-stone-700/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
                      <h3 className="text-terra-500 font-serif font-bold text-xl mb-4 relative z-10">数字化出土文档</h3>
                      <p className="text-stone-400 text-xs leading-relaxed mb-8 font-serif italic relative z-10">
                        " 考古发掘是对人类文明碎片的重构。ArchaeoLog 致力于将每一次铲尖的发现，转化为永恒的数字印记。 "
                      </p>
                      <button className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-white border border-stone-700 px-6 py-3 rounded-full hover:bg-white hover:text-stone-900 transition-all uppercase relative z-10">
                         <Camera size={12} /> Professional Archive
                      </button>
                  </div>
              </div>
          </div>
       </main>

      {/* Comprehensive Settings Modal */}
      {showSettings && user && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-4xl h-[70vh] rounded-3xl shadow-2xl border border-stone-200 relative overflow-hidden flex flex-col md:flex-row">
                 {/* Close Button */}
                 <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 z-50 p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors">
                     <X size={20} />
                 </button>

                 {/* Sidebar Navigation */}
                 <div className="w-full md:w-64 bg-stone-50 border-b md:border-b-0 md:border-r border-stone-100 flex flex-col p-4 shrink-0">
                     <div className="mb-6 px-2 pt-2 hidden md:block">
                        <h2 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                            <Settings className="text-terra-600" size={20}/> 系统设置
                        </h2>
                     </div>
                     
                     <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
                        <button 
                            onClick={() => setSettingsTab('data')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${settingsTab === 'data' ? 'bg-white text-terra-600 shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'}`}
                        >
                            <Server size={18} /> 数据管理
                        </button>
                        <button 
                            onClick={() => setSettingsTab('profile')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${settingsTab === 'profile' ? 'bg-white text-terra-600 shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'}`}
                        >
                            <UserCog size={18} /> 个人中心
                        </button>
                        <button 
                            onClick={() => setSettingsTab('changelog')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${settingsTab === 'changelog' ? 'bg-white text-terra-600 shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'}`}
                        >
                            <History size={18} /> 更新日志
                        </button>
                        <button 
                            onClick={() => setSettingsTab('about')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${settingsTab === 'about' ? 'bg-white text-terra-600 shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'}`}
                        >
                            <Info size={18} /> 关于应用
                        </button>
                     </nav>

                     <div className="mt-auto hidden md:block px-4 py-4">
                        <div className="text-[10px] text-stone-400 font-mono">ArchaeoLog v1.3.0</div>
                     </div>
                 </div>

                 {/* Content Area */}
                 <div className="flex-1 overflow-y-auto p-6 md:p-10 relative bg-white">
                     
                     {/* Tab: Data Management */}
                     {settingsTab === 'data' && (
                         <div className="space-y-8 animate-in fade-in duration-300">
                             <div>
                                 <h3 className="text-xl font-bold text-stone-800 mb-2">数据管理</h3>
                                 <p className="text-stone-500 text-sm">导入导出或备份您的考古记录数据。</p>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {/* Import Excel */}
                                 <div className="p-6 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col gap-4">
                                     <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                         <FileSpreadsheet size={20} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-stone-800">导入 Excel</h4>
                                         <p className="text-xs text-stone-500 mt-1">支持 .xlsx 格式，需符合标准模板</p>
                                     </div>
                                     <button 
                                        onClick={handleImportExcelTrigger}
                                        disabled={loading}
                                        className="mt-auto py-2 px-4 bg-white border border-stone-200 rounded-lg text-sm font-bold text-stone-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                                     >
                                         选择文件导入
                                     </button>
                                 </div>

                                 {/* Export Excel */}
                                 <div className="p-6 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col gap-4">
                                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                         <Download size={20} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-stone-800">导出 Excel</h4>
                                         <p className="text-xs text-stone-500 mt-1">导出当前所有记录为表格文件</p>
                                     </div>
                                     <button 
                                        onClick={handleExportExcel}
                                        className="mt-auto py-2 px-4 bg-white border border-stone-200 rounded-lg text-sm font-bold text-stone-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                                     >
                                         立即导出
                                     </button>
                                 </div>

                                 {/* JSON Backup & Restore */}
                                 <div className="p-6 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col gap-4 md:col-span-2">
                                     <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                         <Database size={20} />
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-stone-800">全量备份与恢复 (JSON)</h4>
                                         <p className="text-xs text-stone-500 mt-1">使用 JSON 格式进行完整数据迁移，包含所有图片及元数据。</p>
                                     </div>
                                     <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                         <button 
                                            onClick={handleExportBackup}
                                            className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                         >
                                             <Download size={16} /> 立即备份 (导出 JSON)
                                         </button>
                                         <button 
                                            onClick={handleImportJSONTrigger}
                                            className="flex-1 py-2 px-4 bg-white border border-stone-200 rounded-lg text-sm font-bold text-stone-600 hover:border-amber-500 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
                                         >
                                             <Upload size={16} /> 恢复数据
                                         </button>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     )}

                     {/* Tab: Profile */}
                     {settingsTab === 'profile' && (
                         <div className="max-w-md mx-auto animate-in fade-in duration-300">
                             <div className="text-center mb-8">
                                <h3 className="text-xl font-bold text-stone-800">个人信息</h3>
                                <p className="text-stone-500 text-sm mt-1">管理您的账户资料和安全设置</p>
                             </div>

                             <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="flex flex-col items-center mb-6">
                                    <div 
                                      className="relative group cursor-pointer" 
                                      onClick={() => avatarInputRef.current?.click()}
                                      title="点击更换头像"
                                    >
                                        <div className="w-24 h-24 rounded-full border-4 border-stone-100 shadow-sm overflow-hidden bg-stone-100 relative">
                                           <img src={previewAvatar || user.avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                                           <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Camera className="text-white" size={24} />
                                           </div>
                                        </div>
                                        <div className="absolute bottom-0 right-0 bg-stone-900 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                                           <Edit2 size={12} />
                                        </div>
                                    </div>
                                    <input 
                                       type="file" 
                                       ref={avatarInputRef} 
                                       onChange={handleAvatarChange} 
                                       className="hidden" 
                                       accept="image/*"
                                    />
                                    <span className="text-xs text-stone-400 font-mono mt-2">@{user.username}</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">显示名称</label>
                                    <input name="displayName" defaultValue={user.displayName} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terra-500/20 outline-none font-bold text-stone-700" required />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">新密码 (选填)</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                                        <input name="newPassword" type="password" placeholder="若不修改请留空" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-terra-500/20 outline-none" />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl hover:bg-stone-800 transition-all mt-4 shadow-lg hover:shadow-xl active:scale-95">
                                    保存修改
                                </button>
                             </form>
                         </div>
                     )}

                     {/* Tab: Changelog */}
                     {settingsTab === 'changelog' && (
                         <div className="animate-in fade-in duration-300">
                             <div className="mb-8">
                                 <h3 className="text-xl font-bold text-stone-800">更新日志</h3>
                                 <p className="text-stone-500 text-sm mt-1">ArchaeoLog 版本历史记录</p>
                             </div>

                             <div className="space-y-8 relative before:absolute before:inset-0 before:ml-2.5 before:w-0.5 before:-translate-x-px before:bg-stone-200 before:h-full">
                                 
                                 {/* v1.3.0 - Today */}
                                 <div className="relative pl-8">
                                     <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-terra-500 shadow-sm"></div>
                                     <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-2">
                                         <h4 className="font-bold text-stone-800 text-lg">v1.3.0</h4>
                                         <span className="text-xs font-mono text-stone-400">今日</span>
                                     </div>
                                     <ul className="list-disc list-inside text-sm text-stone-600 space-y-1">
                                         <li><span className="font-bold text-terra-600">修复</span>：个人信息（头像/昵称）离线状态下无法保存的问题。</li>
                                         <li><span className="font-bold text-terra-600">新增</span>：全量数据备份功能，支持一键导出所有数据为 JSON 文件。</li>
                                         <li>优化：数据管理界面布局，整合备份与恢复选项。</li>
                                     </ul>
                                 </div>

                                 {/* v1.2.0 */}
                                 <div className="relative pl-8">
                                     <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-stone-400"></div>
                                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-2">
                                         <h4 className="font-bold text-stone-700 text-lg">v1.2.0</h4>
                                         <span className="text-xs font-mono text-stone-400">近期更新</span>
                                     </div>
                                     <ul className="list-disc list-inside text-sm text-stone-600 space-y-1">
                                         <li>新增 <span className="font-bold text-stone-800">DeepSeek</span> AI 模型支持 (V3/R1)。</li>
                                         <li>重构系统设置面板，新增“关于应用”和“更新日志”模块。</li>
                                         <li>优化顶部导航栏布局，提升移动端操作体验。</li>
                                     </ul>
                                 </div>

                                 {/* v1.1.0 */}
                                 <div className="relative pl-8">
                                     <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-white bg-stone-300"></div>
                                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-2">
                                         <h4 className="font-bold text-stone-500 text-lg">v1.1.0</h4>
                                         <span className="text-xs font-mono text-stone-400">初始版本</span>
                                     </div>
                                     <ul className="list-disc list-inside text-sm text-stone-600 space-y-1">
                                         <li>新增数据可视化仪表盘 (StatsChart)。</li>
                                         <li>支持线图 (Drawing) 测量分析功能。</li>
                                         <li>基础文物信息录入与 Excel 导入导出。</li>
                                     </ul>
                                 </div>

                             </div>
                         </div>
                     )}

                     {/* Tab: About */}
                     {settingsTab === 'about' && (
                         <div className="animate-in fade-in duration-300 flex flex-col items-center text-center pt-8">
                             <div className="w-24 h-24 bg-gradient-to-br from-terra-600 to-terra-700 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-terra-600/20 mb-6 rotate-3">
                                <AppLogo className="w-12 h-12" />
                             </div>
                             
                             <h2 className="text-3xl font-serif font-bold text-stone-800 mb-2">ArchaeoLog</h2>
                             <p className="text-stone-500 font-medium mb-8">考古出土器物数字档案系统</p>

                             <div className="max-w-md text-stone-600 text-sm leading-relaxed mb-10 space-y-4">
                                 <p>
                                     ArchaeoLog 是一款专为考古工作者设计的数字化记录工具。它致力于解决田野发掘与室内整理过程中的信息碎片化问题，通过高效的结构化录入和 AI 辅助识别，将每一件出土器物转化为永恒的数字资产。
                                 </p>
                                 <p>
                                     系统集成了 Gemini 与 DeepSeek 等先进大模型，支持从照片中自动提取器物特征、估算尺寸，并提供多维度的统计分析功能。
                                 </p>
                             </div>

                             <div className="bg-stone-50 rounded-xl p-6 border border-stone-200 w-full max-w-sm">
                                 <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Developed By</div>
                                 
                                 <div className="flex items-center justify-center gap-3">
                                     <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-white">
                                         <Github size={20} />
                                     </div>
                                     <div className="text-left">
                                         <div className="font-bold text-stone-800 text-lg">BigCui</div>
                                         <div className="text-xs text-stone-500">Full Stack Developer</div>
                                     </div>
                                 </div>
                             </div>

                             <div className="mt-12 text-xs text-stone-300 font-mono">
                                 © 2024 ArchaeoLog. All rights reserved.
                             </div>
                         </div>
                     )}

                 </div>
             </div>
         </div>
      )}

      {/* Details Modal */}
      {selectedId && !showForm && selectedArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl relative">
              <button 
                onClick={() => setSelectedId(null)} 
                className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>
              <ArtifactDetails 
                 artifact={selectedArtifact} 
                 onClose={() => setSelectedId(null)}
                 onEdit={() => { setIsEditing(true); setShowForm(true); }}
              />
           </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <ArtifactForm 
                initialData={isEditing && selectedId ? selectedArtifact : null}
                existingArtifacts={artifacts}
                onSave={handleSave}
                onCancel={() => setShowForm(false)}
             />
        </div>
      )}
    </div>
  );
};

export default App;
