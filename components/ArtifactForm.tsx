
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Artifact, ArtifactCondition, ArtifactImage, ImageType, PhotoView } from '../types';
import { analyzeArtifactImage } from '../services/geminiService';
import { Loader2, Sparkles, Upload, X, MapPin, Tag, Hash, Layers, Activity, Box, PenTool, ChevronDown, Plus, Trash2, Shapes, Edit3, User, List, Image as ImageIcon, Camera, PenTool as PenToolIcon, FolderOpen, Maximize2, ChevronRight } from 'lucide-react';

interface ArtifactFormProps {
  initialData?: Artifact | null;
  onSave: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

// --- 图片压缩工具 ---
const compressImage = (base64Str: string, maxWidth = 1280, maxHeight = 1280): Promise<string> => {
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
      
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      resolve(compressed);
    };
    img.onerror = () => {
        resolve(base64Str);
    }
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

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, storageKey, placeholder, icon: Icon, required }) => {
  const [options, setOptions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

const PHOTO_VIEWS: PhotoView[] = ['正', '背', '左', '右', '顶', '底', '特写', '其他'];

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
    images: [],
    ...initialData
  });

  const [activeImageTab, setActiveImageTab] = useState<'photo' | 'drawing'>('photo');
  const [selectedPhotoView, setSelectedPhotoView] = useState<PhotoView>('正');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Auto Rename Logic Helper
  const generateFileName = (view: string, type: ImageType) => {
    // 规则: 遗址名+单位号+层位+编号+器物名称 + (视图)
    // 示例: 夏县东下冯遗址H1003②:2 陶鬲 (正)
    const parts = [
      formData.siteName,
      formData.unit,
      formData.layer,
      formData.serialNumber ? (formData.serialNumber.includes(':') ? formData.serialNumber : `:${formData.serialNumber}`) : '',
      formData.name ? ` ${formData.name}` : ''
    ];
    
    // Cleaning undefined or empty parts
    const baseName = parts.filter(p => p).join('').replace(/[\/\\?%*:|"<>]/g, '-'); // Sanitize filename
    const suffix = type === 'photo' ? (view === '其他' ? '' : `(${view})`) : '(线图)';
    return `${baseName}${suffix}.jpg`;
  };

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

  const dimMode = useMemo(() => {
    const isPottery = formData.category?.includes('陶');
    const isGood = ['完整', '基本完整', '已修复', ArtifactCondition.INTACT, ArtifactCondition.NEARLY_INTACT, ArtifactCondition.RESTORED].includes(formData.condition || '');
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
    const sanitized = val.replace(/[^\d.]/g, '');
    setDimValues(prev => ({ ...prev, [field]: sanitized }));
  };

  const handleValueUpdate = <K extends keyof Artifact>(name: K) => (value: Artifact[K]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: ImageType, view?: PhotoView) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        try {
          const compressed = await compressImage(result);
          const finalView = view || '默认';
          const newImage: ArtifactImage = {
            id: Date.now().toString() + Math.random(),
            type,
            view: finalView,
            url: compressed,
            fileName: generateFileName(finalView, type) // Initial name generation
          };

          setFormData(prev => {
             // For specific views (e.g. 'Front'), replace existing if any, else append
             // BUT for Drawings, we just append to list, we don't replace
             let newImages = prev.images || [];
             
             if (type === 'photo') {
                newImages = newImages.filter(img => !(img.type === type && img.view === finalView));
                newImages.push(newImage);
             } else {
                // Drawing - Just add
                newImages.push(newImage);
                // Auto select newly added drawing
                setSelectedDrawingId(newImage.id);
             }
             return { ...prev, images: newImages };
          });

        } catch (err) {
          console.error("Compression failed", err);
        } finally {
          setIsCompressing(false);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = ''; 
    }
  };

  const removeImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter(img => img.id !== id) || []
    }));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
  };

  const getImagesByType = (type: ImageType) => {
    return formData.images?.filter(img => img.type === type) || [];
  };

  const currentPhoto = useMemo(() => {
    return formData.images?.find(img => img.type === 'photo' && img.view === selectedPhotoView);
  }, [formData.images, selectedPhotoView]);

  const currentDrawing = useMemo(() => {
    const drawings = getImagesByType('drawing');
    if (selectedDrawingId) return drawings.find(d => d.id === selectedDrawingId) || null;
    return drawings.length > 0 ? drawings[0] : null;
  }, [formData.images, selectedDrawingId]);


  const handleAIAnalysis = async () => {
    // Use the "Front" photo or the first photo available
    const frontImage = formData.images?.find(img => img.type === 'photo' && img.view === '正') || formData.images?.find(img => img.type === 'photo');
    
    if (!frontImage) {
        alert("请先上传正面照片以便AI识别");
        return;
    }
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeArtifactImage(frontImage.url);
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

    // --- Final Auto-Rename Logic before Saving ---
    // Ensure all filenames match the current form data (in case user changed name after upload)
    const updatedImages = formData.images?.map(img => ({
        ...img,
        fileName: generateFileName(img.view || 'image', img.type)
    })) || [];
    
    // Set thumbnail to Front Photo or First Photo
    const thumbnail = updatedImages.find(img => img.type === 'photo' && img.view === '正')?.url || updatedImages[0]?.url;

    const finalData = {
        ...formData,
        images: updatedImages,
        imageUrl: thumbnail // Backward compatibility / Thumbnail
    };

    onSave(finalData as Omit<Artifact, 'id' | 'createdAt'>);
  };

  const labelClass = "block text-xs font-bold text-stone-500 mb-1 uppercase tracking-wider";
  
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-2xl border border-stone-200 max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-200 h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3 shrink-0">
        <h2 className="text-xl font-serif text-stone-800 font-bold flex items-center gap-2">
          <span className="w-1.5 h-6 bg-terra-500 rounded-full inline-block"></span>
          {initialData ? `编辑记录: ${initialData.name}` : '登记新出土文物'}
        </h2>
        <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1.5 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-y-auto pr-1">
        
        {/* Left Column: Image Management */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
            <div className="bg-stone-50 rounded-xl p-1 flex gap-1 border border-stone-200 shrink-0 mb-4">
                <button 
                    onClick={() => setActiveImageTab('photo')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeImageTab === 'photo' ? 'bg-white text-terra-600 shadow-sm border border-stone-100' : 'text-stone-400 hover:text-stone-600'}`}
                >
                    <Camera size={14} /> 照片记录
                </button>
                <button 
                    onClick={() => setActiveImageTab('drawing')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeImageTab === 'drawing' ? 'bg-white text-terra-600 shadow-sm border border-stone-100' : 'text-stone-400 hover:text-stone-600'}`}
                >
                    <PenToolIcon size={14} /> 线图绘制
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-4">
                {activeImageTab === 'photo' ? (
                    <>
                        {/* 1. Main Stage (Active View) */}
                        <div className="relative flex-1 bg-stone-100/50 rounded-2xl border-2 border-dashed border-stone-200 hover:border-terra-300 transition-colors group overflow-hidden flex items-center justify-center min-h-[300px]">
                            {currentPhoto ? (
                                <div className="relative w-full h-full bg-stone-900 flex items-center justify-center">
                                    <img src={currentPhoto.url} alt={selectedPhotoView} className="max-w-full max-h-full object-contain shadow-lg" />
                                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-bold border border-white/20">
                                        {selectedPhotoView}视图
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button 
                                            onClick={() => removeImage(currentPhoto.id)} 
                                            className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-all shadow-lg"
                                            title="删除此照片"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                     <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-stone-900/70 backdrop-blur text-white text-xs px-4 py-2 rounded-full pointer-events-none">
                                            点击下方切换视图或重新上传
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-stone-300 pointer-events-none p-8 text-center">
                                    <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mb-4 text-stone-400">
                                       <Camera size={40} />
                                    </div>
                                    <h3 className="text-stone-500 font-bold text-lg mb-1">{selectedPhotoView}视图 空缺</h3>
                                    <p className="text-xs max-w-[200px]">点击此处或下方胶片上传<br/>支持 JPG/PNG 格式</p>
                                </div>
                            )}
                            {/* Overlay Upload Input for Main Stage */}
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleImageUpload(e, 'photo', selectedPhotoView)} 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                title={`上传${selectedPhotoView}视图`}
                            />
                        </div>

                        {/* 2. Filmstrip Slider (Sliding Selection) */}
                        <div className="shrink-0 h-24 bg-stone-50 border border-stone-200 rounded-xl p-2 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
                            {PHOTO_VIEWS.map(view => {
                                const hasImage = formData.images?.find(img => img.type === 'photo' && img.view === view);
                                const isSelected = selectedPhotoView === view;
                                
                                return (
                                    <button
                                        key={view}
                                        onClick={() => setSelectedPhotoView(view)}
                                        className={`shrink-0 w-20 h-full rounded-lg relative overflow-hidden transition-all duration-200 group/film ${
                                            isSelected 
                                                ? 'ring-2 ring-terra-500 shadow-md scale-105 z-10' 
                                                : 'opacity-70 hover:opacity-100 hover:bg-stone-200 bg-stone-100 border border-stone-100'
                                        }`}
                                    >
                                        {hasImage ? (
                                            <img src={hasImage.url} className="w-full h-full object-cover" alt={view} />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center">
                                                <Plus size={16} className="text-stone-400 mb-1"/>
                                            </div>
                                        )}
                                        
                                        {/* Label Overlay */}
                                        <div className={`absolute inset-x-0 bottom-0 py-0.5 text-[9px] font-bold text-center truncate ${
                                            hasImage ? 'bg-black/60 text-white backdrop-blur-sm' : 'text-stone-500 bg-stone-200/50'
                                        }`}>
                                            {view}
                                        </div>

                                        {/* Quick Upload on Filmstrip Node */}
                                         <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => {
                                                setSelectedPhotoView(view); // Switch to this view on upload
                                                handleImageUpload(e, 'photo', view);
                                            }} 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            title={`直接上传${view}视图`}
                                            onClick={(e) => e.stopPropagation()} // Prevent button click, let input handle it
                                        />
                                    </button>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    // Line Drawing Mode - Optimized to Main Stage + Filmstrip
                     <>
                        {/* 1. Main Stage (Active Drawing) */}
                        <div className="relative flex-1 bg-stone-100/50 rounded-2xl border-2 border-dashed border-stone-200 hover:border-terra-300 transition-colors group overflow-hidden flex items-center justify-center min-h-[300px]">
                            {currentDrawing ? (
                                <div className="relative w-full h-full bg-white flex items-center justify-center">
                                    <img src={currentDrawing.url} alt="Drawing Preview" className="max-w-full max-h-full object-contain p-4" />
                                    
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button 
                                            onClick={() => removeImage(currentDrawing.id)} 
                                            className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-all shadow-lg"
                                            title="删除此线图"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-4 inset-x-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <span className="bg-stone-900/70 text-white text-[10px] px-3 py-1 rounded-full">{currentDrawing.fileName}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-stone-300 pointer-events-none p-8 text-center">
                                    <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mb-4 text-stone-400">
                                       <PenToolIcon size={40} />
                                    </div>
                                    <h3 className="text-stone-500 font-bold text-lg mb-1">暂无线图</h3>
                                    <p className="text-xs max-w-[200px]">点击此处或下方上传电子线图<br/>支持 PNG/JPG 扫描件</p>
                                </div>
                            )}
                            {/* Overlay Upload Input for Main Stage (Adds new if empty, or replaces/adds?) -> Just add new for drawings usually */}
                             <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleImageUpload(e, 'drawing')} 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                title="上传线图"
                            />
                        </div>

                        {/* 2. Filmstrip Slider (Dynamic List) */}
                        <div className="shrink-0 h-24 bg-stone-50 border border-stone-200 rounded-xl p-2 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
                             {/* Add Button as First Item */}
                            <button className="shrink-0 w-20 h-full rounded-lg bg-white border-2 border-dashed border-stone-200 flex flex-col items-center justify-center hover:bg-terra-50 hover:border-terra-300 transition-colors group relative">
                                <Plus size={20} className="text-stone-300 group-hover:text-terra-500 mb-1"/>
                                <span className="text-[10px] text-stone-400 font-bold group-hover:text-terra-600">添加</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => handleImageUpload(e, 'drawing')} 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    title="添加新线图"
                                />
                            </button>

                            {/* Dynamic Drawing List */}
                            {getImagesByType('drawing').map(img => {
                                const isSelected = currentDrawing?.id === img.id;
                                return (
                                    <button
                                        key={img.id}
                                        onClick={() => setSelectedDrawingId(img.id)}
                                        className={`shrink-0 w-20 h-full rounded-lg relative overflow-hidden transition-all duration-200 bg-white border ${
                                            isSelected 
                                                ? 'ring-2 ring-terra-500 shadow-md scale-105 z-10 border-transparent' 
                                                : 'opacity-80 hover:opacity-100 hover:border-stone-300 border-stone-200'
                                        }`}
                                    >
                                        <img src={img.url} className="w-full h-full object-contain p-1" alt="thumb" />
                                    </button>
                                )
                            })}
                        </div>
                     </>
                )}
            </div>

            {/* AI Action Bar */}
             <div className="mt-4 pt-4 border-t border-stone-100">
                <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || isCompressing}
                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm shadow-sm shrink-0 ${
                    isAnalyzing || isCompressing
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200' 
                        : 'bg-gradient-to-r from-terra-700 to-orange-700 text-white hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]'
                    }`}
                >
                    {isAnalyzing || isCompressing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {isAnalyzing ? 'AI 正在鉴定...' : isCompressing ? '正在处理图像...' : '基于当前正面照进行 AI 识别'}
                </button>
            </div>
        </div>

        {/* Right Column: Data Entry */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4 overflow-y-auto pr-1">
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

          <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-100 grid grid-cols-3 gap-3 shadow-sm">
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
          
          <div className="space-y-1 bg-terra-50/30 p-4 rounded-2xl border border-terra-100/50">
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
                    className="w-full px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-stone-50/50 hover:bg-white transition-all text-stone-700 placeholder:text-stone-400 h-9" 
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
              rows={4} 
              placeholder="记录文物的形态、纹饰、风格等详细信息..." 
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-stone-50/50 hover:bg-white transition-all text-stone-700 placeholder:text-stone-400 resize-none" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-stone-100 pb-2">
            <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 hover:border-stone-300 transition-colors text-sm">取消</button>
            <button type="submit" disabled={isCompressing} className="px-8 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-md hover:shadow-lg active:scale-95 text-sm flex items-center gap-2 disabled:opacity-50">
              {initialData ? <Edit3 size={16} /> : null}
              {initialData ? '更新档案' : '保存归档'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArtifactForm;
