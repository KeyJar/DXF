
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Database, Trash2, Edit2, Hash, Camera, LayoutGrid, Box, LogOut, Download, Upload, FileSpreadsheet, Menu, X, Save, User as UserIcon, Folder, ChevronRight, Activity, PieChart, Layers, Settings, Lock, Image as ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import StatsChart from './components/StatsChart';
import ArtifactForm from './components/ArtifactForm';
import ArtifactDetails from './components/ArtifactDetails';
import LoginScreen from './components/LoginScreen';
import { Artifact, User } from './types';

// Simple Logo Component (Trowel Icon)
const AppLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M12 22L5 9h14l-7 13zM12 9V5M10 2h4v3h-4V2z" />
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
        
        // Square crop strategy or maintain aspect ratio? 
        // For avatars, usually we want square, but here let's just resize and let CSS handle display
        if (width > height) {
           if (width > maxWidth) {
             height *= maxWidth / width;
             width = maxWidth;
           }
        } else {
           if (height > maxWidth) { // Use maxWidth for height limit too for simplicity
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
  const [showProfile, setShowProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    try {
      const savedUser = localStorage.getItem('archaeo_current_user');
      if (savedUser) setUser(JSON.parse(savedUser));

      const savedData = localStorage.getItem('artifacts');
      if (savedData) {
        setArtifacts(JSON.parse(savedData));
      }
    } catch (e) {
      console.error("Failed to load initial data", e);
    }
  }, []);

  // Update preview when opening profile
  useEffect(() => {
    if (showProfile && user) {
        setPreviewAvatar(user.avatarUrl);
    }
  }, [showProfile, user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('archaeo_current_user', JSON.stringify(userData));
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

  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const newPassword = formData.get('newPassword') as string;

    const updatedUser = { ...user, displayName, avatarUrl: previewAvatar };
    if (newPassword) updatedUser.password = newPassword;

    // Update in list of all users
    try {
        const storedUsers = localStorage.getItem('archaeo_users');
        if (storedUsers) {
            const users: User[] = JSON.parse(storedUsers);
            const index = users.findIndex(u => u.username === user.username);
            if (index !== -1) {
                users[index] = updatedUser;
                localStorage.setItem('archaeo_users', JSON.stringify(users));
            }
        }
    } catch(err) { console.error("Update failed", err)}

    setUser(updatedUser);
    localStorage.setItem('archaeo_current_user', JSON.stringify(updatedUser));
    setShowProfile(false);
    alert('个人信息已更新');
  };

  const saveArtifacts = (newArtifacts: Artifact[]) => {
    setArtifacts(newArtifacts);
    localStorage.setItem('artifacts', JSON.stringify(newArtifacts));
  };

  const handleSave = (data: Omit<Artifact, 'id' | 'createdAt'>) => {
    if (isEditing && selectedId) {
      const currentArtifact = artifacts.find(a => a.id === selectedId);
      if (currentArtifact) {
        const updated = artifacts.map(a => a.id === selectedId ? { ...data, id: selectedId, createdAt: currentArtifact.createdAt } : a);
        saveArtifacts(updated);
        setIsEditing(false);
      }
    } else {
      const newArtifact: Artifact = {
        ...data,
        id: Date.now().toString(),
        createdAt: Date.now()
      };
      saveArtifacts([newArtifact, ...artifacts]);
      setSelectedId(null); 
    }
    setShowForm(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (window.confirm('确定要删除这条记录吗？此操作不可恢复。')) {
      saveArtifacts(artifacts.filter(a => a.id !== id));
      if (selectedId === id) setSelectedId(null);
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
       '描述': item.description,
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
      reader.onload = (event) => {
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
                 description: row['描述'],
                 finder: row['发现者'],
                 recorder: row['录入者'],
                 images: [], // Images usually cannot be imported from simple Excel rows easily
                 imageUrl: '' 
              }));

              if (newArtifacts.length > 0) {
                 if (window.confirm(`解析成功，准备导入 ${newArtifacts.length} 条数据。是否继续？`)) {
                     saveArtifacts([...newArtifacts, ...artifacts]);
                     alert("导入完成");
                 }
              } else {
                  alert("未在表格中发现有效数据");
              }
          } catch (err) {
              console.error(err);
              alert("Excel 解析失败，请检查文件格式");
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
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
           if(window.confirm(`发现 ${json.length} 条记录。确定要覆盖当前数据吗？`)) {
             saveArtifacts(json);
             alert('数据导入成功！');
           }
        } else {
          alert('文件格式错误');
        }
      } catch (err) { alert('文件解析失败'); }
    };
    reader.readAsText(file);
    e.target.value = '';
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

  if (!user) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans">
       
       {/* --- Top Header (Black) --- */}
       <header className="bg-stone-900 text-stone-200 shadow-lg sticky top-0 z-40">
           <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
             <div className="flex items-center gap-3" onClick={() => setSelectedSiteFilter(null)}>
               <div className="text-terra-500 cursor-pointer">
                 <AppLogo className="w-6 h-6" />
               </div>
               <div className="flex flex-col cursor-pointer">
                  <h1 className="text-lg font-serif font-bold text-white leading-tight tracking-tight">Archaeology</h1>
                  <span className="text-[10px] text-stone-400">考古出土器物数字档案</span>
               </div>
             </div>
             
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  {/* Excel Import/Export */}
                  <div className="flex bg-stone-800 rounded-lg p-1 border border-stone-700">
                      <button onClick={handleImportExcelTrigger} className="px-3 py-1 rounded hover:bg-stone-700 text-white transition-colors text-xs font-bold flex items-center gap-1.5" title="导入Excel">
                         <FileSpreadsheet size={14} /> 导入
                      </button>
                      <input type="file" ref={excelInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
                      <div className="w-px bg-stone-700 my-1"></div>
                      <button onClick={handleExportExcel} className="px-3 py-1 rounded hover:bg-stone-700 text-white transition-colors text-xs font-bold flex items-center gap-1.5" title="导出Excel">
                         <Download size={14} /> 导出
                      </button>
                  </div>
                  
                  {/* JSON Backup (Hidden more deeply or separate) */}
                  <button onClick={handleImportJSONTrigger} className="p-2 text-stone-400 hover:text-white transition-colors" title="恢复备份 (JSON)">
                     <Upload size={14} />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImportJSON} className="hidden" accept=".json" />
               </div>
               
               <div className="h-6 w-px bg-stone-700 mx-2"></div>

               <div className="flex items-center gap-2 cursor-pointer hover:bg-stone-800 py-1 px-2 rounded-lg transition-colors group" onClick={() => setShowProfile(true)}>
                  <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-white group-hover:text-terra-400 transition-colors">{user.displayName}</div>
                  </div>
                  <img src={user.avatarUrl} className="w-8 h-8 rounded-full border-2 border-stone-700 group-hover:border-terra-500 transition-colors object-cover" alt="User" />
               </div>
               
               <button onClick={handleLogout} className="text-stone-500 hover:text-red-400 transition-colors ml-2">
                   <LogOut size={16} />
               </button>
             </div>
           </div>
       </header>

       {/* --- Main Content --- */}
       <main className="max-w-[1600px] mx-auto px-6 py-8">
          
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
             <div className="relative w-full max-w-3xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="检索遗址名称、器物名称或编号..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-xl shadow-sm border border-stone-200 focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none text-stone-700 placeholder:text-stone-400 text-lg transition-all"
                />
             </div>
             <button 
                onClick={() => { setIsEditing(false); setSelectedId(null); setShowForm(true); }}
                className="w-full md:w-auto px-8 py-3.5 bg-terra-600 hover:bg-terra-700 text-white rounded-full font-bold shadow-lg shadow-terra-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
             >
                <Plus size={20} /> 新增登记
             </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* --- Left Column: Dashboard or List --- */}
              <div className="lg:col-span-8 space-y-6">
                 
                 {/* Breadcrumb if filtered */}
                 {selectedSiteFilter && (
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setSelectedSiteFilter(null)} className="text-stone-400 hover:text-stone-600 font-bold">首页</button>
                        <ChevronRight size={14} className="text-stone-300" />
                        <span className="font-bold text-stone-800">{selectedSiteFilter}</span>
                        <span className="bg-stone-200 text-stone-600 text-[10px] px-2 py-0.5 rounded-full">{filteredArtifacts.length}</span>
                    </div>
                 )}

                 {/* MODE A: Dashboard (Site Cards) */}
                 {!selectedSiteFilter && !searchTerm ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {siteGroups.map(site => (
                            <div 
                                key={site.name}
                                onClick={() => setSelectedSiteFilter(site.name)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 hover:shadow-md hover:border-terra-200 transition-all cursor-pointer group flex items-center gap-4"
                            >
                                <div className="w-20 h-20 rounded-xl bg-stone-100 shrink-0 overflow-hidden border border-stone-100 group-hover:border-terra-100 transition-colors">
                                    {site.image ? (
                                        <img src={site.image} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                                            <Folder size={32} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-serif font-bold text-stone-800 mb-1 truncate group-hover:text-terra-700 transition-colors">{site.name}</h3>
                                    <div className="text-xs text-stone-400 mb-2">上次更新: {site.formattedDate}</div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 text-xs font-bold gap-1 group-hover:bg-terra-50 group-hover:text-terra-700 transition-colors">
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
                        <table className="w-full text-left text-sm">
                          <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 font-medium">
                            <tr>
                              <th className="px-4 py-3 pl-6">文物信息</th>
                              <th className="px-4 py-3">遗址/单位</th>
                              <th className="px-4 py-3">质地/器类</th>
                              <th className="px-4 py-3 text-right pr-6">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {filteredArtifacts.map(item => (
                              <tr key={item.id} className="hover:bg-stone-50/50 group transition-colors">
                                <td className="px-4 py-3 pl-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 cursor-pointer" onClick={() => setSelectedId(item.id)}>
                                      {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                                          <Box size={16} />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-bold text-stone-800 font-serif cursor-pointer hover:text-terra-600" onClick={() => setSelectedId(item.id)}>{item.name}</div>
                                      <div className="text-xs text-stone-400 font-mono">{item.serialNumber || '无编号'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-stone-600">
                                  <div className="font-medium">{item.siteName}</div>
                                  <div className="text-xs text-stone-400">{item.unit}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                                    {item.material} · {item.category}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right pr-6">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        {filteredArtifacts.length === 0 && (
                            <div className="py-20 text-center text-stone-400 flex flex-col items-center">
                                <Box size={40} className="mb-2 opacity-20" />
                                暂无匹配数据
                            </div>
                        )}
                     </div>
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
                        " 考古发掘是对人类文明碎片的重构。Archaeology 致力于将每一次铲尖的发现，转化为永恒的数字印记。 "
                      </p>
                      <button className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-white border border-stone-700 px-6 py-3 rounded-full hover:bg-white hover:text-stone-900 transition-all uppercase relative z-10">
                         <Camera size={12} /> Professional Archive
                      </button>
                  </div>

              </div>
          </div>
       </main>

      {/* Profile Modal */}
      {showProfile && user && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl border border-stone-200 relative">
                 <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors">
                     <X size={20} />
                 </button>
                 
                 <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                     <Settings size={20} className="text-terra-600"/> 个人中心
                 </h2>
                 
                 <form onSubmit={handleUpdateProfile} className="space-y-5">
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
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">显示名称 (昵称)</label>
                        <input name="displayName" defaultValue={user.displayName} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 outline-none font-bold text-stone-700" required />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">新密码 (留空则不修改)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            <input name="newPassword" type="password" placeholder="输入新密码" className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 outline-none" />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 transition-all mt-2">
                        保存修改
                    </button>
                 </form>
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
                onSave={handleSave}
                onCancel={() => setShowForm(false)}
             />
        </div>
      )}
    </div>
  );
};

export default App;
