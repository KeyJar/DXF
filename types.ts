
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
  createdAt?: number;
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
  
  coordinateN?: string;  // 北坐标
  coordinateE?: string;  // 东坐标
  coordinateZ?: string;  // 高程

  categoryType: '陶器' | '小件'; // NEW: Broad Classification
  
  name: string;          // 器物名称
  category?: string;     // 器类 (Legacy field, acts as Sub-category now)
  material: string;      // 质地
  
  // NEW: Pottery Specific Fields
  potteryTexture?: string; // 陶质 (e.g., 夹砂、泥质)
  potteryColor?: string;   // 陶色 (e.g., 红陶、灰陶)
  decoration?: string;     // 纹饰 (e.g., 绳纹、弦纹)

  quantity: number;      // 数量
  condition: ArtifactCondition | string; // 保存状况
  dimensions: string;    // 尺寸 (e.g., "H: 20cm, D: 10cm")
  excavationDate: string;// 出土日期
  
  images: ArtifactImage[]; // NEW: Multiple images
  imageUrl?: string;     // Legacy/Thumbnail (Usually points to the first 'Front' photo)
  
  description: string;   // 描述/详细记录
  remarks?: string;      // NEW: 备注 (Short tags like "采集", "旧藏", "展出")
  
  aiAnalysis?: string;   // AI 分析结果
  finder?: string;       // 发现者
  recorder?: string;     // 录入者
  createdAt: number;
}

export interface StatsData {
  label: string;
  value: number;
}
