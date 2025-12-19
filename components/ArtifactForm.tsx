
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Artifact, ArtifactCondition } from '../types';
import { analyzeArtifactImage } from '../services/geminiService';
import { Loader2, Sparkles, Upload, X, MapPin, Tag, Hash, Layers, Activity, Box, PenTool, ChevronDown, Plus, Trash2, Shapes, Edit3, User, List } from 'lucide-react';

interface ArtifactFormProps {
  initialData?: Artifact | null;
  onSave: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

// --- 图片压缩工具 ---
const compressImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
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
      ctx?.drawImage(img, 0, 0, width, height);
      
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      resolve(compressed);
    };
  });
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  storageKey: string;
  placeholder?: string;
  icon?: React.ElementType;
  required?: boolean;
}

// 带记忆功能的自定义下拉组件
const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, storageKey, placeholder, icon: Icon, required }) => {
  const [options, setOptions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化加载用户保存过的选项
  useEffect(() => {
    const saved = localStorage.getItem(`custom_opts_${storageKey}`);
    if (saved) {
      setOptions(JSON.parse(saved));
    }
  }, [storageKey]);

  const saveOptions = (newOptions: string[]) => {
    const uniqueOptions = Array.from(new Set(newOptions)).filter(Boolean);
    setOptions(uniqueOptions);
    localStorage.setItem(`custom_opts_${storageKey}`, JSON.stringify(uniqueOptions));
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value && !options.includes(value)) {
      const newOptions = [...options, value];
      saveOptions(newOptions);
      setIsOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, opt: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newOptions = options.filter(o => o !== opt);
    saveOptions(newOptions);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = (value && options.includes(value))
    ? options
    : options.filter(o => o.toLowerCase().includes((value || "").toLowerCase()));

  return (
    <div className="relative group" ref={containerRef}>
      {Icon && <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 group-focus-within:text-terra-500 transition-colors z-10" />}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          required={required}
          className="w-full pl-8 pr-8 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-stone-50/50 hover:bg-white transition-all text-stone-700 placeholder:text-stone-400 truncate h-9"
          placeholder={placeholder}
          autoComplete="off"
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer text-stone-400 hover:text-stone-600"
          onClick={() => {
            inputRef.current?.focus();
            setIsOpen(!isOpen);
          }}
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 no-scrollbar ring-1 ring-black ring-opacity-5">
           {value && !options.includes(value) && (
            <div 
              onClick={handleAdd}
              className="px-3 py-2 text-xs text-terra-600 hover:bg-terra-50 cursor-pointer flex items-center gap-2 border-b border-stone-100 font-medium sticky top-0 bg-white"
            >
              <Plus size={12} />
              添加 "{value}" 为新选项
            </div>
          )}
          {filteredOptions.length === 0 && !value && (
            <div className="px-3 py-4 text-xs text-stone-400 text-center italic">
              暂无历史记录，请输入并添加
            </div>
          )}
          {filteredOptions.map(opt => (
            <div 
              key={opt} 
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center group/item transition-colors ${value === opt ? 'bg-terra-50 text-terra-700 font-medium' : 'text-stone-700 hover:bg-stone-50'}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              <span className="truncate">{opt}</span>
              <button onClick={(e) => handleDelete(e, opt)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-1">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ArtifactForm: React.FC<ArtifactFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Artifact>>({
    quantity: 1,
    excavationDate: new Date().toISOString().split('T')[0],
    condition: '',
    dimensions: '',
    category: '',
    material: '',
    siteName: '',
    name: '',
    ...initialData
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreviewCompressing, setIsPreviewCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl || null);

  // 解析现有的尺寸字符串
  const parseDimensions = (dimStr: string) => {
    const parts: Record<string, string> = {};
    if (!dimStr) return parts;
    const regex = /([^，,：:]+)\s*[：:]\s*([\d.]+)(?:cm)?/g;
    let match;
    while ((match = regex.exec(dimStr)) !== null) {
      parts[match[1].trim()] = match[2];
    }
    return parts;
  };

  const [dimValues, setDimValues] = useState<Record<string, string>>(() => parseDimensions(initialData?.dimensions || ''));

  // 动态尺寸输入模式逻辑
  const dimMode = useMemo(() => {
    const isPottery = formData.category === '陶器';
    // 匹配“完整”类的词汇
    const isGood = ['完整', '基本完整', '已修复', ArtifactCondition.INTACT, ArtifactCondition.NEARLY_INTACT, ArtifactCondition.RESTORED].includes(formData.condition || '');
    // 匹配“残缺”类的词汇
    const isDamaged = ['残缺', ArtifactCondition.DAMAGED].includes(formData.condition || '');

    if (isPottery) {
      if (isGood) return { fields: ['口径', '底径', '通高'], label: '陶器(良好)' };
      if (isDamaged) return { fields: ['残长', '残宽', '残高'], label: '陶器(残缺)' };
      return { fields: ['长', '宽', '高'], label: '陶器(通用)' };
    } else {
      if (isDamaged) return { fields: ['长/残长', '宽/残宽'], label: '通用(残缺)' };
      return { fields: ['长', '宽'], label: '通用(良好)' };
    }
  }, [formData.category, formData.condition]);

  // 当尺寸分量输入变化时，自动更新整体 dimensions 字段
  useEffect(() => {
    const parts = dimMode.fields
      .map(field => dimValues[field] ? `${field}: ${dimValues[field]}cm` : null)
      .filter(Boolean);
    const result = parts.join(', ');
    if (result !== formData.dimensions) {
      setFormData(prev => ({ ...prev, dimensions: result }));
    }
  }, [dimValues, dimMode.fields]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDimChange = (field: string, val: string) => {
    // 仅保留数字和小数点
    const sanitized = val.replace(/[^\d.]/g, '');
    setDimValues(prev => ({ ...prev, [field]: sanitized }));
  };

  // Fix: Generic type K extends keyof Artifact ensures that we can handle both string and number fields correctly.
  const handleValueUpdate = <K extends keyof Artifact>(name: K) => (value: Artifact[K]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPreviewCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const compressed = await compressImage(result);
        setPreviewUrl(compressed);
        setFormData(prev => ({ ...prev, imageUrl: compressed }));
        setIsPreviewCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIAnalysis = async () => {
    if (!previewUrl) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeArtifactImage(previewUrl);
      if (result) {
        setFormData(prev => ({
          ...prev,
          name: result.name || prev.name,
          category: result.category || prev.category,
          material: result.material || prev.material,
          condition: result.condition || prev.condition,
          description: result.description || prev.description,
        }));
      }
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI 分析失败，请检查网络或 API Key 设置。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siteName || !formData.name) {
      alert("请填写必要的遗址名称和器物名称");
      return;
    }
    onSave(formData as Omit<Artifact, 'id' | 'createdAt'>);
  };

  const labelClass = "block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider";
  const dimInputClass = "w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-stone-50/50 hover:bg-white transition-all text-stone-700 placeholder:text-stone-400 h-9";

  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-2xl border border-stone-200 max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-5 border-b border-stone-100 pb-3">
        <h2 className="text-xl font-serif text-stone-800 font-bold flex items-center gap-2">
          <span className="w-1.5 h-6 bg-terra-500 rounded-full inline-block"></span>
          {initialData ? `编辑记录: ${initialData.name}` : '登记新出土文物'}
        </h2>
        <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1.5 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-3">
          <div className="aspect-[4/5] bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 hover:border-terra-300 hover:bg-stone-100 transition-colors flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer shadow-inner">
            {isPreviewCompressing ? (
              <div className="text-center">
                <Loader2 className="animate-spin text-terra-500 mx-auto mb-2" />
                <span className="text-xs text-stone-500">正在处理图片...</span>
              </div>
            ) : previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">点击更换照片</div>
              </>
            ) : (
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-terra-500">
                  <Upload size={20} />
                </div>
                <h3 className="text-stone-600 font-medium mb-1 text-sm">上传文物照片</h3>
                <p className="text-stone-400 text-[10px]">支持高清原图</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          
          <button
            type="button"
            onClick={handleAIAnalysis}
            disabled={!previewUrl || isAnalyzing || isPreviewCompressing}
            className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-xs shadow-sm h-9 ${
              !previewUrl || isPreviewCompressing
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200' 
                : 'bg-gradient-to-r from-terra-600 to-orange-600 text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            {isAnalyzing ? '正在智能鉴定...' : 'AI 智能识别'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="md:col-span-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-0.5">
              <label className={labelClass}>遗址名称 <span className="text-red-400">*</span></label>
              <CustomSelect 
                value={formData.siteName || ''} 
                onChange={handleValueUpdate('siteName')} 
                storageKey="sites" 
                icon={MapPin} 
                placeholder="请输入并添加遗址" 
                required 
              />
            </div>
            <div className="space-y-0.5">
              <label className={labelClass}>出土日期</label>
              <input 
                type="date" 
                name="excavationDate" 
                value={formData.excavationDate || ''} 
                onChange={handleInputChange} 
                className="w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-stone-50/50 hover:bg-white transition-all text-stone-700 h-9" 
              />
            </div>
          </div>

          <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-100 grid grid-cols-3 gap-3">
             <div className="space-y-0.5">
              <label className={labelClass}>单位/探方</label>
              <CustomSelect 
                value={formData.unit || ''} 
                onChange={handleValueUpdate('unit')} 
                storageKey="units" 
                icon={Hash} 
                placeholder="探方" 
              />
            </div>
            <div className="space-y-0.5">
              <label className={labelClass}>层位</label>
              <CustomSelect 
                value={formData.layer || ''} 
                onChange={handleValueUpdate('layer')} 
                storageKey="layers" 
                icon={Layers} 
                placeholder="层位" 
              />
            </div>
             <div className="space-y-0.5">
              <label className={labelClass}>编号</label>
              <CustomSelect 
                value={formData.serialNumber || ''} 
                onChange={handleValueUpdate('serialNumber')} 
                storageKey="serialNumbers" 
                icon={Tag} 
                placeholder="编号" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <label className={labelClass}>器物名称 <span className="text-red-400">*</span></label>
              <CustomSelect 
                value={formData.name || ''} 
                onChange={handleValueUpdate('name')} 
                storageKey="artifactNames" 
                icon={Tag} 
                placeholder="器名" 
                required 
              />
            </div>
             <div className="space-y-0.5">
              <label className={labelClass}>器类</label>
              <CustomSelect 
                value={formData.category || ''} 
                onChange={handleValueUpdate('category')} 
                storageKey="categories" 
                icon={Shapes} 
                placeholder="类别 (如：陶器)" 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-0.5">
              <label className={labelClass}>质地</label>
              <CustomSelect 
                value={formData.material || ''} 
                onChange={handleValueUpdate('material')} 
                storageKey="materials" 
                icon={Box} 
                placeholder="质地" 
              />
            </div>
            <div className="space-y-0.5">
              <label className={labelClass}>数量</label>
              <CustomSelect 
                value={formData.quantity?.toString() || '1'} 
                onChange={(val) => handleValueUpdate('quantity')(parseInt(val) || 1)} 
                storageKey="quantities" 
                icon={List}
                placeholder="数量" 
              />
            </div>
             <div className="space-y-0.5">
              <label className={labelClass}>保存状况</label>
               <CustomSelect 
                value={formData.condition || ''} 
                onChange={handleValueUpdate('condition')} 
                storageKey="conditions" 
                icon={Activity} 
                placeholder="状况" 
              />
            </div>
          </div>
          
          <div className="space-y-1 bg-terra-50/30 p-3 rounded-xl border border-terra-100/50">
            <div className="flex justify-between items-center mb-1">
              <label className={labelClass}>尺寸 (单位：cm)</label>
              <span className="text-[10px] text-terra-600 bg-terra-100 px-1.5 py-0.5 rounded font-medium border border-terra-200">{dimMode.label}</span>
            </div>
            <div className={`grid gap-2 ${dimMode.fields.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {dimMode.fields.map(field => (
                <div key={field} className="relative group">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 group-focus-within:text-terra-500">cm</span>
                  <input 
                    value={dimValues[field] || ''} 
                    onChange={(e) => handleDimChange(field, e.target.value)} 
                    placeholder={field} 
                    className={dimInputClass} 
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-1 italic">
              * 输入数字即可，系统将按规范生成尺寸描述。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
            <div className="space-y-0.5">
              <label className={labelClass}>发现者</label>
              <CustomSelect 
                value={formData.finder || ''} 
                onChange={handleValueUpdate('finder')} 
                storageKey="people" 
                icon={User} 
                placeholder="姓名" 
              />
            </div>
            <div className="space-y-0.5">
              <label className={labelClass}>录入者</label>
              <CustomSelect 
                value={formData.recorder || ''} 
                onChange={handleValueUpdate('recorder')} 
                storageKey="people" 
                icon={PenTool} 
                placeholder="姓名" 
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className={labelClass}>描述</label>
            <textarea 
              name="description" 
              value={formData.description || ''} 
              onChange={handleInputChange} 
              rows={2} 
              placeholder="记录文物的形态、纹饰、风格等详细信息..." 
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-stone-50/50 hover:bg-white transition-all text-stone-700 placeholder:text-stone-400 resize-none" 
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-1.5 rounded-lg border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors text-xs">取消</button>
            <button type="submit" disabled={isPreviewCompressing} className="px-5 py-1.5 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition-all shadow-md hover:shadow-lg active:scale-95 text-xs flex items-center gap-1.5 disabled:opacity-50">
              {initialData ? <Edit3 size={14} /> : null}
              {initialData ? '更新记录' : '保存记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArtifactForm;
