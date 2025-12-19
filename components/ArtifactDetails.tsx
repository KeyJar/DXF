
import React, { useState } from 'react';
import { Artifact, ImageType } from '../types';
import { X, Calendar, MapPin, Hash, Layers, Tag, Box, Activity, User, PenTool, Edit3, Image as ImageIcon, Camera, Maximize2, Ruler, Shapes, List } from 'lucide-react';

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
        
        {/* Left: Image Gallery (Dark Theme) */}
        <div className="w-full md:w-5/12 lg:w-1/2 bg-stone-900 flex flex-col relative h-[40vh] md:h-auto border-r border-stone-800">
          {/* Header Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
             <div className="flex bg-stone-800/80 backdrop-blur-md rounded-lg p-1 border border-stone-700">
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
            <div className="h-20 bg-stone-950 border-t border-stone-800 flex items-center gap-2 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
               {images.map(img => (
                 <button 
                   key={img.id}
                   onClick={() => setSelectedImageId(img.id)}
                   className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all relative ${
                     (currentImage?.id === img.id) ? 'border-terra-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                   }`}
                 >
                   <img src={img.url} className="w-full h-full object-cover" alt="thumbnail" />
                   {img.view && (
                     <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 truncate">
                       {img.view}
                     </div>
                   )}
                 </button>
               ))}
            </div>
          )}
        </div>

        {/* Right: Info Scrollable */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
           <div className="flex justify-between items-start p-6 border-b border-stone-100 bg-stone-50/50 sticky top-0 z-20 backdrop-blur-sm">
              <div>
                <div className="flex items-center gap-2 text-terra-600 font-bold text-xs uppercase tracking-widest mb-1">
                   <MapPin size={12} /> {artifact.siteName}
                </div>
                <h2 className="text-3xl font-serif font-bold text-stone-900">{artifact.name}</h2>
              </div>
              <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors">
                <X size={24} />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              {/* Core Identity */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <InfoItem icon={Hash} label="单位/探方" value={artifact.unit} />
                 <InfoItem icon={Layers} label="层位" value={artifact.layer} />
                 <InfoItem icon={Tag} label="出土编号" value={artifact.serialNumber} />
                 <InfoItem icon={Calendar} label="出土日期" value={artifact.excavationDate} />
              </div>

              <hr className="border-stone-100" />

              {/* Physical Attributes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <InfoItem icon={Shapes} label="器类" value={artifact.category} />
                 <InfoItem icon={Box} label="质地" value={artifact.material} />
                 <InfoItem icon={List} label="数量" value={artifact.quantity} />
                 <InfoItem icon={Activity} label="保存状况" value={artifact.condition} />
                 <InfoItem icon={Ruler} label="测量尺寸" value={artifact.dimensions} fullWidth />
              </div>

              {/* Description Box */}
              <div className="bg-stone-50 p-6 rounded-xl border border-stone-100">
                <div className="flex items-center gap-2 text-stone-500 mb-3 font-bold text-xs uppercase tracking-wider">
                  <PenTool size={14} /> 描述记录
                </div>
                <p className="text-stone-700 leading-relaxed font-serif text-sm whitespace-pre-line">
                  {artifact.description || "暂无详细描述..."}
                </p>
              </div>
              
              {/* Personnel */}
               <div className="flex gap-8 text-xs text-stone-500 pt-4">
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

           {/* Footer Actions */}
           <div className="p-4 border-t border-stone-100 bg-white flex justify-end gap-3 sticky bottom-0 z-20">
              <button 
                onClick={onClose} 
                className="px-6 py-2.5 rounded-xl border border-stone-200 text-stone-500 font-bold hover:bg-stone-50 transition-colors text-sm"
              >
                关闭
              </button>
              <button 
                onClick={onEdit} 
                className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-lg active:scale-95 text-sm flex items-center gap-2"
              >
                <Edit3 size={16} /> 编辑档案
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ArtifactDetails;
