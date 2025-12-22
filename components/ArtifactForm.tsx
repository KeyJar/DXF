
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import JSZip from 'jszip';
import { Artifact, ArtifactCondition, ArtifactImage, ImageType, PhotoView } from '../types';
import { analyzeArtifactPhoto, analyzeArtifactDrawing, AVAILABLE_MODELS, DEFAULT_MODEL } from '../services/aiService';
import { X, MapPin, Tag, Hash, Layers, Activity, Box, PenTool, ChevronDown, Plus, Trash2, Edit3, User, List, Camera, PenTool as PenToolIcon, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, ChevronLeft, ChevronRight, Image as ImageIcon, Calendar, Ruler, ScanLine, Sticker, GripVertical, Compass, MoveVertical, Map as MapIcon, Sparkles, Settings, ArrowRight, Save, Repeat, Cpu, Gem, Package, Check, RotateCw, Archive } from 'lucide-react';

interface ArtifactFormProps {
  initialData?: Artifact | null;
  existingArtifacts?: Artifact[];
  defaultCategoryType?: '陶器' | '小件';
  onSave: (artifact: Omit<Artifact, 'id' | 'createdAt'>, closeForm: boolean) => void;
  onCancel: () => void;
}

// --- 图片压缩工具 ---
const compressImage = (file: File, maxWidth = 1280, maxHeight = 1280): Promise<string> => {
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
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error("Image load failed"));
    };
    reader.onerror = () => reject(new Error("File read failed"));
  });
};

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  storageKey: string;
  recommendations?: string[];
  placeholder?: string;
  icon?: React.ElementType;
  required?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, storageKey, recommendations = [], placeholder, icon: Icon, required }) => {
  const [localOptions, setLocalOptions] = useState<string[]>([]);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    const savedOpts = localStorage.getItem(`custom_opts_${storageKey}`);
    const savedOrder = localStorage.getItem(`custom_order_${storageKey}`);
    if (savedOpts) setLocalOptions(JSON.parse(savedOpts));
    if (savedOrder) setCustomOrder(JSON.parse(savedOrder));
  }, [storageKey]);

  const saveLocalOptions = (newOptions: string[]) => {
    const uniqueOptions = Array.from(new Set(newOptions)).filter(Boolean);
    setLocalOptions(uniqueOptions);
    localStorage.setItem(`custom_opts_${storageKey}`, JSON.stringify(uniqueOptions));
  };

  const saveCustomOrder = (newOrder: string[]) => {
    const uniqueOrder = Array.from(new Set(newOrder)).filter(Boolean);
    setCustomOrder(uniqueOrder);
    localStorage.setItem(`custom_order_${storageKey}`, JSON.stringify(uniqueOrder));
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value && !localOptions.includes(value)) {
      const newOptions = [value, ...localOptions];
      saveLocalOptions(newOptions);
      const newOrder = [value, ...customOrder];
      saveCustomOrder(newOrder);
      setIsOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, opt: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newOptions = localOptions.filter(o => o !== opt);
    saveLocalOptions(newOptions);
    if (customOrder.includes(opt)) {
         const newOrder = customOrder.filter(p => p !== opt);
         saveCustomOrder(newOrder);
    }
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _displayOptions = [...displayOptions];
    const draggedItemContent = _displayOptions[dragItem.current];
    _displayOptions.splice(dragItem.current, 1);
    _displayOptions.splice(dragOverItem.current, 0, draggedItemContent);
    saveCustomOrder(_displayOptions);
    dragItem.current = null;
    dragOverItem.current = null;
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

  const displayOptions = useMemo(() => {
      const ordered = [...customOrder];
      const freq = recommendations.filter(r => !ordered.includes(r));
      const history = localOptions.filter(o => !ordered.includes(o) && !recommendations.includes(o));
      const all = [...ordered, ...freq, ...history];
      if (!value || all.includes(value)) return all;
      return all.filter(o => o.toLowerCase().includes(value.toLowerCase()));
  }, [customOrder, recommendations, localOptions, value]);

  return (
    <div className="relative group w-full" ref={containerRef}>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-terra-500 transition-colors z-10" />}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          required={required}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-white transition-all text-stone-700 placeholder:text-stone-300 truncate`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer text-stone-400 hover:text-stone-600"
          onClick={() => { inputRef.current?.focus(); setIsOpen(!isOpen); }}
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 no-scrollbar ring-1 ring-black ring-opacity-5">
           {value && !localOptions.includes(value) && !recommendations.includes(value) && !customOrder.includes(value) && (
            <div onClick={handleAdd} className="px-3 py-2 text-xs text-terra-600 hover:bg-terra-50 cursor-pointer flex items-center gap-2 border-b border-stone-100 font-medium sticky top-0 bg-white z-10">
              <Plus size={12} /> 添加 "{value}" 到列表
            </div>
          )}
          {displayOptions.map((opt, idx) => (
             <div 
                key={opt} 
                className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center group/item transition-colors relative ${value === opt ? 'bg-terra-50 text-terra-700 font-medium' : 'text-stone-700 hover:bg-stone-50'}`}
                draggable={!value}
                onDragStart={(e) => { if (value) return; dragItem.current = idx; e.dataTransfer.effectAllowed = "move"; }}
                onDragEnter={() => { if (value) return; dragOverItem.current = idx; }}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => { onChange(opt); setIsOpen(false); }}
             >
                <div className="flex items-center gap-2 truncate flex-1">
                    {!value && <div className="text-stone-300 cursor-grab hover:text-stone-500 active:cursor-grabbing"><GripVertical size={12} /></div>}
                    <span className="truncate">{opt}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button onClick={(e) => handleDelete(e, opt)} className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded" title="删除选项"><Trash2 size={12} /></button>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  prefixText?: string;
}

const IconInput: React.FC<IconInputProps> = ({ icon: Icon, prefixText, className, ...props }) => {
    return (
        <div className="relative group w-full">
            {prefixText ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 group-focus-within:text-terra-600 z-10 bg-white/50 px-1 rounded">{prefixText}</div>
            ) : (
                Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-terra-500 transition-colors z-10" />
            )}
            <input 
                {...props}
                className={`w-full ${prefixText ? 'pl-8' : (Icon ? 'pl-10' : 'pl-3')} pr-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-white transition-all text-stone-700 placeholder:text-stone-300 font-mono ${className}`}
            />
        </div>
    )
}

const PHOTO_VIEWS: PhotoView[] = ['正', '背', '左', '右', '顶', '底', '特写', '其他'];

const FilmstripItem = memo(({ view, isSelected, image, onClick }: { view: string, isSelected: boolean, image?: ArtifactImage, onClick: (view: any) => void }) => {
    return (
        <button
            type="button"
            className={`shrink-0 w-16 h-full rounded-lg relative overflow-hidden transition-all duration-200 group/film flex items-center justify-center ${isSelected ? 'ring-2 ring-terra-500 shadow-md scale-105 z-10' : 'opacity-70 hover:opacity-100 bg-stone-100 border border-stone-100 hover:bg-stone-200'}`}
            onClick={() => onClick(view)}
        >
            {image ? <img src={image.url} className="w-full h-full object-cover" alt={view} loading="lazy" /> : <div className="flex flex-col items-center justify-center text-stone-300 gap-1"><div className={`w-6 h-6 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center ${isSelected ? 'border-terra-400 text-terra-400' : ''}`}><ImageIcon size={12} /></div></div>}
            <div className={`absolute inset-x-0 bottom-0 py-0.5 text-[8px] font-bold text-center truncate pointer-events-none ${image ? 'bg-black/60 text-white backdrop-blur-sm' : 'text-stone-500 bg-stone-200/50'}`}>{view}</div>
        </button>
    );
}, (prev, next) => prev.isSelected === next.isSelected && prev.image?.id === next.image?.id);

const ArtifactForm: React.FC<ArtifactFormProps> = ({ onSave, onCancel, initialData, existingArtifacts = [], defaultCategoryType = '陶器' }) => {
  const DEFAULT_FORM_DATA: Partial<Artifact> = {
    categoryType: defaultCategoryType,
    quantity: 1,
    excavationDate: new Date().toISOString().split('T')[0],
    condition: '',
    dimensions: '',
    category: '',
    material: '',
    siteName: '',
    name: '',
    remarks: '',
    coordinateN: '',
    coordinateE: '',
    coordinateZ: '',
    potteryTexture: '',
    potteryColor: '',
    decoration: '',
    images: [],
  };

  const [formData, setFormData] = useState<Partial<Artifact>>({ ...DEFAULT_FORM_DATA, ...initialData });
  
  // AI State
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [customModelId, setCustomModelId] = useState('');
  const [showModelSelect, setShowModelSelect] = useState(false);

  // UI State
  const [selectedPhotoView, setSelectedPhotoView] = useState<PhotoView>('正');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<ImageType | null>(null);
  const [previewContext, setPreviewContext] = useState<{ images: ArtifactImage[], index: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZipping, setIsZipping] = useState(false);

  // Stats for Recommendations
  const sortedOptions = useMemo(() => {
    const calculateFrequency = (key: keyof Artifact) => {
        const map = new Map<string, number>();
        existingArtifacts.forEach(a => {
            const val = a[key];
            if (typeof val === 'string' && val) map.set(val, (map.get(val) || 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    };
    return {
        sites: calculateFrequency('siteName'),
        names: calculateFrequency('name'),
        categories: calculateFrequency('category'),
        materials: calculateFrequency('material'),
        conditions: calculateFrequency('condition'),
        finders: calculateFrequency('finder'),
        recorders: calculateFrequency('recorder'),
        potteryTextures: calculateFrequency('potteryTexture'),
        potteryColors: calculateFrequency('potteryColor'),
        decorations: calculateFrequency('decoration'),
    };
  }, [existingArtifacts]);

  // Naming Rule: 遗址名+单位+层位+编号+器名+照片视角/线图
  const generateFileName = (view: string, type: ImageType, strictFormat: boolean = false) => {
    const parts = [
      formData.siteName,
      formData.unit,
      formData.layer,
      formData.serialNumber,
      formData.name
    ];
    
    // For strict format (download), we filter empty but join with hyphen for readability
    const baseName = parts.filter(p => p && p.trim()).join('-');
    
    if (!strictFormat) {
       // Old simple format for internal state if needed, but let's align them.
       // Only difference is suffixes.
    }

    const suffix = type === 'photo' ? (view === '其他' ? '照片' : view) : '线图';
    return `${baseName}-${suffix}.jpg`;
  };

  const parseDimensions = (dimStr: string) => {
    const parts: Record<string, string> = {};
    if (!dimStr) return parts;
    const regex = /([^，,：:]+)\s*[：:]\s*([\d.]+)(?:cm)?/g;
    let match;
    while ((match = regex.exec(dimStr)) !== null) parts[match[1].trim()] = match[2];
    return parts;
  };

  const [dimValues, setDimValues] = useState<Record<string, string>>(() => parseDimensions(initialData?.dimensions || ''));

  const dimMode = useMemo(() => {
    const isPottery = formData.categoryType === '陶器';
    const cond = formData.condition || '';
    
    // Define exact sets based on user requirements
    const goodConds = ['完整', '已修复', '基本完整', 'INTACT', 'NEARLY_INTACT', 'RESTORED'];
    const badConds = ['残', '残缺', '碎片', 'DAMAGED', 'FRAGMENTED'];
    
    const isGood = goodConds.includes(cond);
    const isBad = badConds.some(c => cond.includes(c)); // Check if contains '残' etc.

    if (isPottery) {
      if (isBad) return { fields: ['残长', '残宽', '残高'], label: '陶器(残缺)' };
      // Default to Good fields if not explicitly bad, or if explicitly good
      return { fields: ['口径', '底径', '通高'], label: '陶器(完整/修复)' };
    } else {
      // Small finds
      if (isBad) return { fields: ['残长', '残宽', '残高'], label: '小件(残缺)' };
      return { fields: ['长', '宽', '高', '厚'], label: '小件(完整)' };
    }
  }, [formData.categoryType, formData.condition]);

  useEffect(() => {
    const parts = dimMode.fields.map(field => dimValues[field] ? `${field}: ${dimValues[field]}cm` : null).filter(Boolean);
    const result = parts.join(', ');
    if (result !== formData.dimensions) setFormData(prev => ({ ...prev, dimensions: result }));
  }, [dimValues, dimMode.fields]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Cast to any to avoid "Type 'string' is not assignable to type..." error for strict union fields
    setFormData(prev => ({ ...prev, [name]: value } as any));
  };

  const handleDimChange = (field: string, val: string) => {
    const sanitized = val.replace(/[^\d.]/g, '');
    setDimValues(prev => ({ ...prev, [field]: sanitized }));
  };

  const handleValueUpdate = <K extends keyof Artifact>(name: K) => (value: Artifact[K]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const processImageFile = async (file: File, type: ImageType, view?: PhotoView) => {
    setIsCompressing(true);
    try {
      const base64Url = await compressImage(file);
      const finalView = view || '默认';
      const newImage: ArtifactImage = {
        id: Date.now().toString() + Math.random(),
        type,
        view: finalView,
        url: base64Url,
        fileName: generateFileName(finalView, type)
      };
      setFormData(prev => {
           let newImages = prev.images || [];
           if (type === 'photo') {
              newImages = newImages.filter(img => !(img.type === type && img.view === finalView));
              newImages.push(newImage);
           } else {
              newImages = newImages.filter(img => img.type !== 'drawing');
              newImages.push(newImage);
              setSelectedDrawingId(newImage.id);
           }
           return { ...prev, images: newImages };
      });
    } catch (err) {
      alert("图片处理失败，请重试");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: ImageType, view?: PhotoView) => {
    const file = e.target.files?.[0];
    if (file) { processImageFile(file, type, view); e.target.value = ''; }
  };

  const handleDragOver = (e: React.DragEvent, type: ImageType) => { e.preventDefault(); setIsDragging(true); setDragTarget(type); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); };
  const handleDrop = (e: React.DragEvent, type: ImageType) => {
    e.preventDefault(); setIsDragging(false); setDragTarget(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const view = type === 'photo' ? selectedPhotoView : undefined;
        processImageFile(file, type, view);
    }
  };

  const removeImage = (id: string) => {
    setFormData(prev => ({ ...prev, images: prev.images?.filter(img => img.id !== id) || [] }));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
  };

  const getImagesByType = (type: ImageType) => formData.images?.filter(img => img.type === type) || [];
  const currentPhoto = useMemo(() => formData.images?.find(img => img.type === 'photo' && img.view === selectedPhotoView), [formData.images, selectedPhotoView]);
  const currentDrawing = useMemo(() => getImagesByType('drawing')[0] || null, [formData.images]);

  const handleSubmit = (closeForm: boolean) => (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.siteName || !formData.name) { alert("请填写必要的遗址名称和器物名称"); return; }

    const updatedImages = formData.images?.map(img => ({ ...img, fileName: generateFileName(img.view || 'image', img.type) })) || [];
    const thumbnail = updatedImages.find(img => img.type === 'photo' && img.view === '正')?.url || updatedImages[0]?.url;

    const finalData = { ...formData, images: updatedImages, imageUrl: thumbnail };
    onSave(finalData as Omit<Artifact, 'id' | 'createdAt'>, closeForm);
    
    if (!closeForm) {
        // Reset form but keep Context (Site, Unit, Layer, Date, Finder, Recorder)
        setFormData(prev => ({
            ...DEFAULT_FORM_DATA,
            siteName: prev.siteName,
            unit: prev.unit,
            layer: prev.layer,
            excavationDate: prev.excavationDate,
            finder: prev.finder,
            recorder: prev.recorder,
            categoryType: prev.categoryType,
            coordinateN: prev.coordinateN,
            coordinateE: prev.coordinateE,
            coordinateZ: prev.coordinateZ
        }));
        setDimValues({});
        setSelectedPhotoView('正');
    }
  };

  const activeModelId = selectedModel === 'custom' ? customModelId : selectedModel;

  const handleAIAnalyze = async () => {
      if (!currentPhoto) { alert("请先上传照片"); return; }
      
      setIsAIAnalyzing(true);
      try {
          // Explicitly define category type to match AI service signature and avoid type errors
          const aiCategory = formData.categoryType === '小件' ? '小件' : '陶器';
          
          const result = await analyzeArtifactPhoto(
              currentPhoto.url, 
              aiCategory as '陶器' | '小件',
              activeModelId
          );
          setFormData(prev => ({
              ...prev,
              name: result.name || prev.name,
              material: result.material || prev.material,
              condition: result.condition || prev.condition,
              description: result.description || prev.description,
              // Pottery fields
              potteryTexture: result.potteryTexture || prev.potteryTexture,
              potteryColor: result.potteryColor || prev.potteryColor,
              decoration: result.decoration || prev.decoration,
              aiAnalysis: "AI 识别已完成"
          }));
      } catch (e: any) {
          alert("AI 识别失败: " + e.message);
      } finally {
          setIsAIAnalyzing(false);
      }
  };

  const handleAIMeasure = async () => {
      if (!currentDrawing) { alert("请先上传线图"); return; }
      
      setIsAIAnalyzing(true);
      try {
          const result = await analyzeArtifactDrawing(currentDrawing.url, activeModelId);
          if (result.dimensions) {
             const parts = parseDimensions(result.dimensions);
             setDimValues(prev => ({ ...prev, ...parts }));
             alert(`AI 估算结果: ${result.dimensions}\n(依据: ${result.reasoning})`);
          }
      } catch (e: any) {
          alert("AI 测量失败: " + e.message);
      } finally {
          setIsAIAnalyzing(false);
      }
  };

  const handleBatchDownload = async () => {
      if (!formData.images || formData.images.length === 0) {
          alert("暂无图片可下载");
          return;
      }
      setIsZipping(true);
      try {
          const zip = new JSZip();
          // Create Folder Name
          const folderParts = [
              formData.siteName,
              formData.unit,
              formData.layer,
              formData.serialNumber,
              formData.name
          ].filter(p => p && p.trim()).join('-');
          const folderName = folderParts || 'Artifact-Images';
          const imgFolder = zip.folder(folderName);

          formData.images.forEach((img) => {
              const fileName = generateFileName(img.view || 'default', img.type, true);
              // Clean data URL header
              const base64Data = img.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
              imgFolder?.file(fileName, base64Data, { base64: true });
          });

          const content = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${folderName}.zip`;
          link.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          console.error(e);
          alert("打包失败，请重试");
      } finally {
          setIsZipping(false);
      }
  };

  const openPreview = (startImageId: string) => {
      const allImages = formData.images || [];
      const targetImg = allImages.find(i => i.id === startImageId);
      if(!targetImg) return;
      const type = targetImg.type;
      let relevantImages = getImagesByType(type);
      if (type === 'photo') {
          relevantImages = relevantImages.sort((a, b) => {
              const idxA = PHOTO_VIEWS.indexOf(a.view as any);
              const idxB = PHOTO_VIEWS.indexOf(b.view as any);
              return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          });
      }
      const startIndex = relevantImages.findIndex(img => img.id === startImageId);
      if (startIndex >= 0) { setPreviewContext({ images: relevantImages, index: startIndex }); setZoomLevel(1); }
  };

  const labelClass = "block text-xs font-bold text-stone-500 mb-1.5 ml-1";
  
  return (
    <div className="bg-white flex flex-col h-full relative animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 shrink-0 bg-white/50 backdrop-blur-sm z-30">
        <div className="flex items-center gap-6">
            <h2 className="text-lg font-serif text-stone-800 font-bold flex items-center gap-2">
              {initialData ? <Edit3 className="text-terra-600" size={20} /> : <Plus className="text-terra-600" size={20} />}
              {initialData ? `编辑: ${initialData.name}` : '新增登记'}
            </h2>
            
            {/* Optimized Segmented Control */}
            <div className="bg-stone-100 p-1 rounded-lg flex items-center gap-1 border border-stone-200/50">
                 <button
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, categoryType: '陶器'}))}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all duration-200 ${formData.categoryType === '陶器' ? 'bg-white text-terra-700 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'}`}
                 >
                    <Package size={14} className={formData.categoryType === '陶器' ? 'text-terra-600' : 'text-stone-400'} />
                    陶器
                 </button>
                 <div className="w-px h-3 bg-stone-300 mx-0.5 opacity-50"></div>
                 <button
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, categoryType: '小件'}))}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all duration-200 ${formData.categoryType === '小件' ? 'bg-white text-stone-800 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'}`}
                 >
                    <Gem size={14} className={formData.categoryType === '小件' ? 'text-stone-600' : 'text-stone-400'} />
                    小件
                 </button>
            </div>
        </div>

        <button type="button" onClick={onCancel} className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-2 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-y-auto p-6 scrollbar-thin">
        
        {/* Left Column: Image Management */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-full">
            {/* Photo Section */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col shrink-0">
                <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <h3 className="font-bold text-sm text-stone-700 flex items-center gap-2">
                        <Camera size={16} className="text-terra-500"/> 多视角影像
                    </h3>
                    
                    {/* Action Bar: AI and Download */}
                    <div className="flex gap-2 items-center relative">
                        {/* Download Button */}
                        <button 
                            type="button"
                            onClick={handleBatchDownload}
                            disabled={!formData.images?.length || isZipping}
                            className={`p-1.5 rounded-md transition-colors border ${!formData.images?.length ? 'bg-stone-50 text-stone-300 border-stone-100' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-terra-600'}`}
                            title="打包下载所有图片"
                        >
                            {isZipping ? <RotateCw size={14} className="animate-spin" /> : <Archive size={14} />}
                        </button>

                        <div className="h-4 w-px bg-stone-300 mx-1"></div>

                        {/* Model Selector Area */}
                        <div className="relative bg-white border border-stone-200 rounded-md flex items-center p-0.5">
                            {selectedModel === 'custom' ? (
                                <div className="flex items-center animate-in fade-in zoom-in-95 duration-200">
                                    <input 
                                        type="text" 
                                        value={customModelId}
                                        onChange={(e) => setCustomModelId(e.target.value)}
                                        placeholder="e.g. gemini-1.5-pro"
                                        className="text-[10px] w-24 px-2 py-1 bg-transparent outline-none text-stone-700 font-mono placeholder:text-stone-300"
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => setSelectedModel(DEFAULT_MODEL)} 
                                        className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-600 transition-colors"
                                        title="返回列表"
                                    >
                                        <List size={10} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative group/model">
                                    <button 
                                        type="button"
                                        onClick={() => setShowModelSelect(!showModelSelect)}
                                        className="text-stone-500 hover:text-terra-600 px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold transition-colors"
                                        title="切换 AI 模型"
                                    >
                                        <Cpu size={12} />
                                        <span>{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name.split(' ')[2] || 'Flash'}</span>
                                        <ChevronDown size={10} />
                                    </button>
                                    
                                    {/* Dropdown */}
                                    {showModelSelect && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowModelSelect(false)}></div>
                                            <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-50 w-48 p-1 animate-in fade-in zoom-in-95 duration-100">
                                                {AVAILABLE_MODELS.map(model => (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => { setSelectedModel(model.id); setShowModelSelect(false); }}
                                                        className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-stone-50 flex justify-between items-center ${selectedModel === model.id ? 'bg-terra-50 text-terra-700 font-bold' : 'text-stone-600'}`}
                                                    >
                                                        {model.name}
                                                        {selectedModel === model.id && <Check size={10} />}
                                                    </button>
                                                ))}
                                                <div className="border-t border-stone-100 my-1"></div>
                                                <button
                                                    onClick={() => { setSelectedModel('custom'); setShowModelSelect(false); }}
                                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-stone-50 text-stone-600 flex items-center gap-2"
                                                >
                                                    <Edit3 size={10} /> 自定义模型 ID...
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <button 
                            type="button"
                            onClick={handleAIAnalyze}
                            disabled={isAIAnalyzing || !currentPhoto}
                            className={`flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-md font-bold shadow-sm border transition-all ${
                                isAIAnalyzing 
                                    ? 'bg-stone-100 text-stone-400 border-stone-200' 
                                    : 'bg-terra-600 text-white border-terra-600 hover:bg-terra-700 hover:border-terra-700 active:scale-95'
                            }`}
                        >
                            {isAIAnalyzing ? <RotateCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {isAIAnalyzing ? '分析中...' : 'AI 识别'}
                        </button>
                    </div>
                </div>
                <div className="p-4">
                     <div 
                        className={`relative w-full aspect-[4/3] shrink-0 bg-stone-100/50 rounded-xl border-2 border-dashed transition-colors group overflow-hidden flex items-center justify-center mb-3 ${isDragging && dragTarget === 'photo' ? 'border-terra-500 bg-terra-50/20' : 'border-stone-200 hover:border-terra-300'}`}
                        onDragOver={(e) => handleDragOver(e, 'photo')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'photo')}
                    >
                        {currentPhoto ? (
                            <div className="relative w-full h-full bg-stone-900 flex items-center justify-center group/img">
                                <img src={currentPhoto.url} alt={selectedPhotoView} className="max-w-full max-h-full object-contain shadow-lg" />
                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded text-xs font-bold border border-white/20 pointer-events-none z-20">{selectedPhotoView}</div>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openPreview(currentPhoto.id); }} className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-zoom-in">
                                   <div className="bg-black/30 backdrop-blur-md p-3 rounded-full text-white shadow-lg hover:bg-black/50 transition-colors"><Maximize2 size={24} /></div>
                                </button>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(currentPhoto.id); }} className="absolute top-3 right-3 bg-white/20 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover/img:opacity-100 hover:opacity-100 z-50 cursor-pointer shadow-md"><Trash2 size={16} /></button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-stone-300 pointer-events-none p-4 text-center">
                                <Camera size={32} className={`mb-2 ${isDragging && dragTarget === 'photo' ? 'text-terra-500' : ''}`} />
                                <p className="text-xs text-stone-400">点击或拖拽照片 ({selectedPhotoView})</p>
                            </div>
                        )}
                        {!currentPhoto && <input type="file" accept="image/*" onChange={(e) => handleFileInputChange(e, 'photo', selectedPhotoView)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                    </div>
                    <div className="h-16 bg-stone-50 border border-stone-100 rounded-lg p-1.5 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                        {PHOTO_VIEWS.map(view => <FilmstripItem key={view} view={view} isSelected={selectedPhotoView === view} image={formData.images?.find(img => img.type === 'photo' && img.view === view)} onClick={setSelectedPhotoView} />)}
                    </div>
                </div>
            </div>

            {/* Drawing Section */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <h3 className="font-bold text-sm text-stone-700 flex items-center gap-2">
                        <PenToolIcon size={16} className="text-stone-500"/> 器物线图
                    </h3>
                    <button 
                        type="button"
                        onClick={handleAIMeasure}
                        disabled={isAIAnalyzing || !currentDrawing}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${isAIAnalyzing ? 'bg-stone-100 text-stone-400' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                    >
                        {isAIAnalyzing ? <span className="animate-spin">⏳</span> : <Ruler size={10} />}
                        AI 测量
                    </button>
                </div>
                 <div className="p-4 flex-1">
                    <div 
                        className={`relative w-full aspect-[4/3] h-full min-h-[200px] bg-stone-100/50 rounded-xl border-2 border-dashed transition-colors group overflow-hidden flex items-center justify-center ${isDragging && dragTarget === 'drawing' ? 'border-terra-500 bg-terra-50/20' : 'border-stone-200 hover:border-terra-300'}`}
                        onDragOver={(e) => handleDragOver(e, 'drawing')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'drawing')}
                    >
                        {currentDrawing ? (
                            <div className="relative w-full h-full bg-white flex items-center justify-center group/img">
                                <img src={currentDrawing.url} alt="Drawing Preview" className="max-w-full max-h-full object-contain p-2" />
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openPreview(currentDrawing.id); }} className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-zoom-in">
                                   <div className="bg-white/80 backdrop-blur-sm p-3 rounded-full text-stone-600 shadow-lg hover:bg-white transition-colors border border-stone-200"><Maximize2 size={24} /></div>
                                </button>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(currentDrawing.id); }} className="absolute top-3 right-3 bg-white/80 hover:bg-red-500 hover:text-white text-stone-500 p-2 rounded-full shadow-md border border-stone-100 transition-all opacity-0 group-hover/img:opacity-100 hover:opacity-100 z-50 cursor-pointer"><Trash2 size={16} /></button>
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-stone-300 pointer-events-none p-4 text-center">
                                <PenToolIcon size={32} className={`mb-2 ${isDragging && dragTarget === 'drawing' ? 'text-terra-500' : ''}`} />
                                <p className="text-xs text-stone-400">点击或拖拽线图 (含比例尺)</p>
                            </div>
                        )}
                         {!currentDrawing && <input type="file" accept="image/*" onChange={(e) => handleFileInputChange(e, 'drawing')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                    </div>
                 </div>
            </div>
        </div>

        {/* Right Column: Form Layout */}
        <div className="lg:col-span-7 flex flex-col gap-5 pb-4 h-full">
             
             {/* Row 1: Site + Date */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>遗址名称 *</label>
                    <CustomSelect value={formData.siteName || ''} onChange={handleValueUpdate('siteName')} storageKey="siteName" recommendations={sortedOptions.sites} placeholder="请输入并添加遗址" icon={MapPin} required />
                </div>
                <div>
                    <label className={labelClass}>出土日期</label>
                    <IconInput type="date" name="excavationDate" value={formData.excavationDate} onChange={handleInputChange} icon={Calendar} />
                </div>
             </div>

             {/* Row 2: Unit Group */}
             <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 grid grid-cols-1 md:grid-cols-12 gap-4">
                 <div className="md:col-span-5">
                    <label className={labelClass}>单位</label>
                    <IconInput type="text" name="unit" value={formData.unit || ''} onChange={handleInputChange} placeholder="单位" icon={Hash}/>
                 </div>
                 <div className="md:col-span-3">
                    <label className={labelClass}>层位</label>
                    <IconInput type="text" name="layer" value={formData.layer || ''} onChange={handleInputChange} placeholder="层位" icon={Layers} />
                 </div>
                 <div className="md:col-span-4">
                    <label className={labelClass}>编号</label>
                    <IconInput type="text" name="serialNumber" value={formData.serialNumber || ''} onChange={handleInputChange} placeholder="编号" icon={Tag}/>
                 </div>
             </div>

             {/* Row 3: Name + Material */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-stone-500 ml-1">器物名称 *</label>
                    </div>
                    <CustomSelect value={formData.name || ''} onChange={handleValueUpdate('name')} storageKey="artifactName" recommendations={sortedOptions.names} placeholder="器名" icon={Tag} required />
                 </div>
                 <div>
                    <label className={labelClass}>质地</label>
                    <CustomSelect value={formData.material || ''} onChange={handleValueUpdate('material')} storageKey="material" recommendations={sortedOptions.materials} placeholder="质地" icon={Box} />
                 </div>
             </div>

             {/* POTTERY SPECIFIC FIELDS */}
             {formData.categoryType === '陶器' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-terra-50/50 p-4 rounded-xl border border-terra-100 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div>
                        <label className={`${labelClass} text-terra-700`}>陶质</label>
                        <CustomSelect value={formData.potteryTexture || ''} onChange={handleValueUpdate('potteryTexture')} storageKey="potteryTexture" recommendations={sortedOptions.potteryTextures} placeholder="夹砂/泥质" icon={Box} />
                    </div>
                    <div>
                        <label className={`${labelClass} text-terra-700`}>陶色</label>
                        <CustomSelect value={formData.potteryColor || ''} onChange={handleValueUpdate('potteryColor')} storageKey="potteryColor" recommendations={sortedOptions.potteryColors} placeholder="红/灰/黑" icon={Box} />
                    </div>
                    <div>
                        <label className={`${labelClass} text-terra-700`}>纹饰</label>
                        <CustomSelect value={formData.decoration || ''} onChange={handleValueUpdate('decoration')} storageKey="decoration" recommendations={sortedOptions.decorations} placeholder="纹饰" icon={ScanLine} />
                    </div>
                </div>
             )}

             {/* Row 4: Quantity + Condition */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>数量</label>
                    <IconInput type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="1" icon={List} />
                </div>
                <div>
                    <label className={labelClass}>保存状况</label>
                    <CustomSelect value={formData.condition || ''} onChange={(val) => handleValueUpdate('condition')(val)} storageKey="condition" recommendations={sortedOptions.conditions} placeholder="状况" icon={Activity} />
                </div>
             </div>

             {/* Row 5: Coordinates */}
             <div>
                 <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1"><MapIcon size={12} /> 出土坐标 (CGCS2000)</label>
                 <div className="grid grid-cols-3 gap-4">
                     <div><IconInput type="text" name="coordinateN" value={formData.coordinateN || ''} onChange={handleInputChange} placeholder="" prefixText="N" /></div>
                     <div><IconInput type="text" name="coordinateE" value={formData.coordinateE || ''} onChange={handleInputChange} placeholder="" prefixText="E" /></div>
                     <div><IconInput type="text" name="coordinateZ" value={formData.coordinateZ || ''} onChange={handleInputChange} placeholder="" prefixText="Z" /></div>
                 </div>
             </div>

             {/* Row 6: Dimensions */}
             <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2">
                        <label className={labelClass.replace('mb-1.5', 'mb-0')}>尺寸信息</label>
                        <span className="text-[10px] text-stone-400 font-normal border border-stone-200 px-1.5 rounded">{dimMode.label}</span>
                     </div>
                </div>
                <div className="flex gap-4 mb-2">
                    {dimMode.fields.map(field => (
                        <div key={field} className="flex-1 relative group">
                            <div className="absolute top-1 left-2 text-[10px] text-stone-400 font-bold pointer-events-none">{field}</div>
                            <input type="text" value={dimValues[field] || ''} onChange={(e) => handleDimChange(field, e.target.value)} className="w-full px-3 pt-5 pb-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50/30 focus:bg-white focus:border-terra-400 focus:ring-2 focus:ring-terra-500/10 outline-none transition-all pr-8 font-mono text-stone-700 placeholder:text-transparent" placeholder={field} />
                            <span className="absolute right-3 top-1/2 translate-y-1 text-stone-400 text-xs pointer-events-none">cm</span>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-stone-400 italic mt-1 ml-1">* 请输入数字，系统自动格式化。</p>
             </div>

             {/* Row 7: Personnel */}
             <div className="grid grid-cols-2 gap-4">
                 <div><label className={labelClass}>发现者</label><CustomSelect value={formData.finder || ''} onChange={handleValueUpdate('finder')} storageKey="finder" recommendations={sortedOptions.finders} placeholder="姓名" icon={User} /></div>
                 <div><label className={labelClass}>录入者</label><CustomSelect value={formData.recorder || ''} onChange={handleValueUpdate('recorder')} storageKey="recorder" recommendations={sortedOptions.recorders} placeholder="姓名" icon={Edit3} /></div>
             </div>

             {/* Description */}
             <div>
                <label className={labelClass}>器物描述</label>
                <textarea name="description" value={formData.description || ''} onChange={handleInputChange} rows={5} className="w-full px-3 py-3 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 outline-none resize-none bg-white text-stone-700 placeholder:text-stone-300" placeholder="记录文物的形态、纹饰、风格等详细信息..." />
             </div>
             
             {/* Remarks */}
             <div>
                <label className={labelClass}>备注</label>
                <div className="relative group w-full">
                    <Sticker className="absolute left-3 top-3 w-4 h-4 text-stone-400 group-focus-within:text-terra-500 transition-colors z-10" />
                    <textarea name="remarks" value={formData.remarks || ''} onChange={handleInputChange} rows={4} className="w-full pl-10 pr-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-terra-500/20 focus:border-terra-500 outline-none bg-white transition-all text-stone-700 placeholder:text-stone-300 resize-none" placeholder="填写备注信息..." />
                </div>
             </div>
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-stone-100 mt-auto flex justify-end gap-3 bg-white z-20">
            <button type="button" onClick={onCancel} className="px-6 py-2 rounded-xl text-stone-500 font-bold hover:bg-stone-100 transition-colors text-sm">取消</button>
            
            <button 
                type="button" 
                onClick={handleSubmit(true)}
                className="px-6 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-colors text-sm flex items-center gap-2 border border-stone-200"
            >
                <Save size={16} /> 保存并关闭
            </button>
            
            <button 
                type="button" 
                onClick={handleSubmit(false)}
                className="px-6 py-2 rounded-xl bg-terra-600 hover:bg-terra-700 text-white font-bold shadow-lg shadow-terra-600/20 active:scale-95 transition-all text-sm flex items-center gap-2"
            >
                <Repeat size={16} /> 保存并新增
            </button>
      </div>

      {/* Preview Modal */}
      {previewContext && (
         <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
             <div className="absolute top-4 right-4 z-50 flex gap-4">
                 <button onClick={() => { const current = previewContext.images[previewContext.index]; const link = document.createElement('a'); link.href = current.url; link.download = current.fileName; document.body.appendChild(link); link.click(); document.body.removeChild(link); }} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"><Download size={20} /></button>
                 <button onClick={() => setPreviewContext(null)} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
             </div>
             <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                 <button onClick={() => { if (!previewContext) return; setPreviewContext(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null); setZoomLevel(1); }} className="absolute left-4 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all z-10"><ChevronLeft size={32} /></button>
                 <img src={previewContext.images[previewContext.index].url} className="max-w-full max-h-full object-contain transition-transform duration-200 select-none" style={{ transform: `scale(${zoomLevel})` }} alt="Preview" onWheel={(e) => setZoomLevel(prev => Math.max(1, Math.min(5, prev + e.deltaY * -0.001)))} />
                 <button onClick={() => { if (!previewContext) return; setPreviewContext(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null); setZoomLevel(1); }} className="absolute right-4 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-all z-10"><ChevronRight size={32} /></button>
             </div>
         </div>
      )}
    </div>
  );
};

export default ArtifactForm;
