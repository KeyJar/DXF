
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Layers, Activity, History, Trash2, AlertCircle, User, PenTool, Download, Upload, Calendar, Edit2 } from 'lucide-react';
import { Artifact } from './types';
import ArtifactForm from './components/ArtifactForm';
import StatsChart from './components/StatsChart';
import * as XLSX from 'xlsx';

const PLACEHOLDER_IMG = "https://picsum.photos/400/400?grayscale";

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('archaeo_artifacts');
    if (saved) {
      try {
        setArtifacts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse artifacts", e);
        localStorage.removeItem('archaeo_artifacts');
      }
    } else {
      setArtifacts([
        {
          id: '1',
          siteName: '三星堆遗址',
          unit: 'K2',
          layer: '②',
          serialNumber: 'K2:108',
          name: '青铜面具',
          category: '青铜器',
          material: '铜',
          quantity: 1,
          condition: '基本完整',
          dimensions: '高 65cm, 宽 138cm',
          excavationDate: '2021-06-14',
          imageUrl: PLACEHOLDER_IMG,
          description: '具有夸张的眼部造型，典型的古蜀文明特征。',
          finder: '考古队一队',
          recorder: '张三',
          createdAt: Date.now()
        }
      ]);
    }
    setLoading(false);
  }, []);

  // Safe save with quota handling
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('archaeo_artifacts', JSON.stringify(artifacts));
      } catch (error) {
        console.error("Storage Error:", error);
        // Handle full storage specifically
        if (error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          alert("浏览器存储空间已满！\n原因：照片过多或文件过大。\n建议：删除不必要的旧记录，或使用更小尺寸的照片。当前修改可能无法永久保存。");
        }
      }
    }
  }, [artifacts, loading]);

  const handleSave = (data: Omit<Artifact, 'id' | 'createdAt'>) => {
    if (editingArtifact) {
      setArtifacts(prev => prev.map(a => 
        a.id === editingArtifact.id 
          ? { ...a, ...data, imageUrl: data.imageUrl || a.imageUrl } 
          : a
      ));
      setEditingArtifact(null);
    } else {
      const newArtifact: Artifact = {
        ...data,
        id: generateId(),
        createdAt: Date.now(),
        imageUrl: data.imageUrl || PLACEHOLDER_IMG
      };
      setArtifacts(prev => [newArtifact, ...prev]);
    }
    setShowForm(false);
  };

  const handleEdit = (artifact: Artifact) => {
    setEditingArtifact(artifact);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingArtifact(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    if (confirmDeleteId === id) {
      setArtifacts(prev => prev.filter(a => a.id !== id));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  const handleExport = () => {
    const exportData = artifacts.map(a => ({
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
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "文物记录");
    const fileName = `ArchaeoLog_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);
        const importedArtifacts: Artifact[] = data.map((row: any) => ({
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
          imageUrl: PLACEHOLDER_IMG,
          createdAt: Date.now()
        }));
        if (window.confirm(`成功读取到 ${importedArtifacts.length} 条记录。确定要导入吗？`)) {
          setArtifacts(prev => [...importedArtifacts, ...prev]);
        }
      } catch (error) {
        console.error("Import failed", error);
        alert("导入失败，请检查文件格式是否正确。");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredArtifacts = artifacts.filter(a => 
    a.name.includes(searchTerm) || 
    a.siteName.includes(searchTerm) || 
    a.material.includes(searchTerm) ||
    (a.finder && a.finder.includes(searchTerm)) ||
    (a.recorder && a.recorder.includes(searchTerm)) ||
    (a.serialNumber && a.serialNumber.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-800">
      <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
      <header className="sticky top-0 z-50 bg-stone-900 text-stone-50 shadow-lg border-b-4 border-terra-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-terra-500" />
            <h1 className="text-xl font-serif font-bold tracking-wide">ArchaeoLog <span className="text-stone-400 text-sm font-normal ml-2 hidden sm:inline">考古发掘数字档案</span></h1>
          </div>
          <div className="flex gap-2">
             <button onClick={handleImportClick} className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-2 rounded-lg text-sm transition-colors border border-stone-700">
              <Upload size={16} /><span className="hidden md:inline">导入</span>
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-2 rounded-lg text-sm transition-colors border border-stone-700">
              <Download size={16} /><span className="hidden md:inline">导出</span>
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-terra-600 hover:bg-terra-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-md active:scale-95 ml-2">
              <Plus size={16} /><span className="hidden sm:inline">新增记录</span><span className="sm:hidden">新增</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-4xl my-4 md:my-8 relative">
               <ArtifactForm initialData={editingArtifact} onSave={handleSave} onCancel={handleCloseForm} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-stone-400" />
              </div>
              <input type="text" placeholder="搜索遗址、器物、编号..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-stone-200 rounded-xl leading-5 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-terra-500 focus:border-terra-500 transition shadow-sm" />
            </div>

            <div className="space-y-4">
              {filteredArtifacts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-stone-200 border-dashed">
                  <Layers className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500">暂无相关文物记录</p>
                </div>
              ) : (
                filteredArtifacts.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col sm:flex-row">
                    <div className="w-full sm:w-48 h-48 sm:h-auto min-h-[12rem] relative shrink-0 bg-stone-50">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
                        <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">{item.siteName}</span>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <h3 className="text-lg font-bold text-stone-800 font-serif">{item.name}</h3>
                               {item.serialNumber && <span className="text-[10px] font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded border border-stone-200">{item.serialNumber}</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                              {item.category && <span className="px-2 py-1 bg-terra-50 text-terra-700 rounded-md border border-terra-100 font-medium">{item.category}</span>}
                              <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md border border-stone-200 flex items-center gap-1"><Layers size={10} /> {item.material}</span>
                              <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md border border-stone-200 flex items-center gap-1"><Activity size={10} /> {item.condition}</span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-stone-600 line-clamp-2 leading-relaxed">{item.description || "暂无描述"}</p>
                      </div>
                      <div className="mt-4 flex justify-between items-end border-t border-stone-100 pt-3">
                         <div className="text-[10px] text-stone-400">出土日期: {item.excavationDate}</div>
                         <div className="flex gap-1">
                           <button onClick={() => handleEdit(item)} className="p-2 rounded-lg text-stone-400 hover:text-terra-600 hover:bg-terra-50 transition-colors"><Edit2 size={14} /></button>
                           <button onClick={(e) => handleDelete(e, item.id)} className={`p-2 rounded-lg transition-all ${confirmDeleteId === item.id ? "bg-red-600 text-white" : "text-stone-400 hover:text-red-600 hover:bg-red-50"}`}>
                             {confirmDeleteId === item.id ? <AlertCircle size={14} /> : <Trash2 size={14} />}
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 sticky top-24">
               <h3 className="font-serif font-bold text-stone-800 mb-4 flex items-center gap-2"><Activity size={18} className="text-terra-600"/>出土概况</h3>
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 text-center">
                    <div className="text-xl font-bold text-stone-700">{artifacts.length}</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider">总记录</div>
                  </div>
                   <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 text-center">
                    <div className="text-xl font-bold text-stone-700">{new Set(artifacts.map(a => a.siteName)).size}</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider">遗址数</div>
                  </div>
               </div>
               <StatsChart artifacts={artifacts} />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
