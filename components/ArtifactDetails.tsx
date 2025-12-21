
import React, { useState } from 'react';
import { Artifact, ImageType } from '../types';
import { X, Calendar, MapPin, Hash, Layers, Tag, Box, Activity, User, PenTool, Edit3, Image as ImageIcon, Camera, Maximize2, Ruler, Shapes, List, Sticker } from 'lucide-react';

interface ArtifactDetailsProps {
  artifact: Artifact;
  onClose: () => void;
  onEdit: () => void;
}

const ArtifactDetails: React.FC<ArtifactDetailsProps> = ({ artifact, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState<ImageType>('photo');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const images = artifact.images?.filter(img => img.type === activeTab) || [];
  // Use the selected image, or default to the first one of the active tab
  const currentImage = selectedImageId 
    ? images.find(img => img.id === selectedImageId) || images[0]
    : images[0];

  const InfoItem = ({ icon: Icon, label, value, fullWidth = false }: { icon: any, label: string, value?: string | number, fullWidth?: boolean }) => (
    <div className={`flex flex-col ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-center gap-1.5 text-stone-400 mb-1">
        <Icon size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-stone-800 font-medium text-sm break-words">
        {value || <span className="text-stone-300 italic">-</span>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top: Image Gallery (Dark Theme) - Adaptive Height */}
        <div className="bg-stone-900 flex flex-col relative h-[45%] shrink-0 border-b border-stone-800">
          {/* Header Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
             <div className="flex bg-stone-800/80 backdrop-blur-md rounded-lg p-1 border border-stone-700 pointer-events-auto">
                <button 
                  onClick={() => { setActiveTab('photo'); setSelectedImageId(null); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${activeTab === 'photo' ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
                >
                  <Camera size={14} /> 照片
                </button>
                <button 
                  onClick={() => { setActiveTab('drawing'); setSelectedImageId(null); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-colors ${activeTab === 'drawing' ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
                >
                  <PenTool size={14} /> 线图
                </button>
             </div>
             
             {/* Close button for Split View context */}
             <button onClick={onClose} className="p-2 bg-black/40 text-white/70 hover:text-white hover:bg-black/60 rounded-full transition-colors pointer-events-auto backdrop-blur-md">
                <X size={20} />
             </button>
          </div>

          {/* Main Stage */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative group">
             {currentImage ? (
               <img 
                 src={currentImage.url} 
                 alt={currentImage.view || artifact.name} 
                 className="max-w-full max-h-full object-contain shadow-2xl drop-shadow-2xl transition-transform duration-500" 
               />
             ) : (
               <div className="text-stone-600 flex flex-col items-center gap-3">
                 <ImageIcon size={48} strokeWidth={1} />
                 <p className="text-xs font-mono">暂无{activeTab === 'photo' ? '照片' : '线图'}影像</p>
               </div>
             )}
             
             {currentImage && (
                <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-mono border border-white/10">
                  {currentImage.view && <span className="font-bold mr-2">{currentImage.view}视图</span>}
                  <span className="opacity-70">{currentImage.fileName}</span>
                </div>
             )}
          </div>

          {/* Filmstrip */}
          {images.length > 0 && (
            <div className="h-16 bg-stone-950 border-t border-stone-800 flex items-center gap-2 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent shrink-0">
               {images.map(img => (
                 <button 
                   key={img.id}
                   onClick={() => setSelectedImageId(img.id)}
                   className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all relative ${
                     (currentImage?.id === img.id) ? 'border-terra-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                   }`}
                 >
                   <img src={img.url} className="w-full h-full object-cover" alt="thumbnail" />
                 </button>
               ))}
            </div>
          )}
        </div>

        {/* Bottom: Info Scrollable */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
           <div className="flex justify-between items-start p-6 pb-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-terra-600 font-bold text-xs uppercase tracking-widest mb-1">
                   <MapPin size={12} /> {artifact.siteName}
                </div>
                <h2 className="text-2xl font-serif font-bold text-stone-900">{artifact.name}</h2>
              </div>
              <button 
                onClick={onEdit} 
                className="p-2 bg-stone-50 text-stone-600 hover:text-terra-600 hover:bg-terra-50 rounded-lg transition-colors border border-stone-100"
                title="编辑"
              >
                <Edit3 size={18} />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
              {/* Core Identity */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <InfoItem icon={Hash} label="单位" value={artifact.unit} />
                 <InfoItem icon={Layers} label="层位" value={artifact.layer} />
                 <InfoItem icon={Tag} label="出土编号" value={artifact.serialNumber} />
                 <InfoItem icon={Calendar} label="出土日期" value={artifact.excavationDate} />
              </div>

              <hr className="border-stone-100" />

              {/* Physical Attributes */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                 <InfoItem icon={Shapes} label="器类" value={artifact.category} />
                 <InfoItem icon={Box} label="质地" value={artifact.material} />
                 <InfoItem icon={List} label="数量" value={artifact.quantity} />
                 <InfoItem icon={Activity} label="保存状况" value={artifact.condition} />
                 <InfoItem icon={Sticker} label="备注" value={artifact.remarks} />
                 <InfoItem icon={Ruler} label="测量尺寸" value={artifact.dimensions} fullWidth />
              </div>

              {/* Description Box */}
              <div className="bg-stone-50 p-5 rounded-xl border border-stone-100">
                <div className="flex items-center gap-2 text-stone-500 mb-2 font-bold text-xs uppercase tracking-wider">
                  <PenTool size={14} /> 详细记录
                </div>
                <p className="text-stone-700 leading-relaxed font-serif text-sm whitespace-pre-line">
                  {artifact.description || "暂无详细记录..."}
                </p>
              </div>
              
              {/* Personnel */}
               <div className="flex gap-6 text-xs text-stone-500 pt-2 pb-4">
                  <div className="flex items-center gap-2">
                     <User size={14} className="text-stone-300"/> 
                     <span>发现者: <span className="font-bold text-stone-700">{artifact.finder || '未记录'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                     <Edit3 size={14} className="text-stone-300"/> 
                     <span>录入者: <span className="font-bold text-stone-700">{artifact.recorder || '未记录'}</span></span>
                  </div>
               </div>
           </div>
        </div>
    </div>
  );
};

export default ArtifactDetails;
