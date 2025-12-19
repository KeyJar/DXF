
export enum ArtifactCondition {
  INTACT = '完整',
  NEARLY_INTACT = '基本完整',
  DAMAGED = '残缺',
  FRAGMENTED = '碎片',
  RESTORED = '已修复'
}

export interface User {
  username: string;
  password?: string;
  avatarUrl: string;
  displayName: string;
  settings?: {
    autoRenameExport?: boolean;
    exportPath?: string; // New field for custom export folder path
  };
}

export type ImageType = 'photo' | 'drawing';
export type PhotoView = '正' | '背' | '左' | '右' | '顶' | '底' | '特写' | '其他';

export interface ArtifactImage {
  id: string;
  type: ImageType;
  view?: PhotoView | string; // For photos: Front, Back, etc. For drawings: Section, etc.
  url: string; // Base64
  fileName: string; // Auto-generated filename
}

export interface Artifact {
  id: string;
  siteName: string;      // 遗址名称
  unit?: string;         // 单位/探方 (e.g., T101)
  layer?: string;        // 层位 (e.g., ③层)
  serialNumber?: string; // 编号 (e.g., H1:23)
  name: string;          // 器物名称
  category?: string;     // 器类 (e.g., 陶器, 铜器)
  material: string;      // 质地
  quantity: number;      // 数量
  condition: ArtifactCondition | string; // 保存状况
  dimensions: string;    // 尺寸 (e.g., "H: 20cm, D: 10cm")
  excavationDate: string;// 出土日期
  
  images: ArtifactImage[]; // NEW: Multiple images
  imageUrl?: string;     // Legacy/Thumbnail (Usually points to the first 'Front' photo)
  
  description: string;   // 描述/备注
  aiAnalysis?: string;   // AI 分析结果
  finder?: string;       // 发现者
  recorder?: string;     // 录入者
  createdAt: number;
}

export interface StatsData {
  label: string;
  value: number;
}