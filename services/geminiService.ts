
import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (base64Image: string) => base64Image.split(',')[1] || base64Image;

/**
 * Analyzes an artifact PHOTO to suggest metadata (Name, Material, Description).
 */
export const analyzeArtifactPhoto = async (base64Image: string): Promise<any> => {
  try {
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(base64Image)
            }
          },
          {
            text: `你是一位专业的考古学家。请分析这张文物照片，并返回一个 JSON 对象。
            请仅识别以下字段：
            - name: 器物名称 (例如：彩陶罐, 青铜剑, 泥质灰陶鬲)
            - material: 质地 (例如：夹砂红陶, 青铜, 玉, 骨)
            - description: 对器物的纹饰、形状、风格的简短专业描述 (100字以内)
            
            不需要推测尺寸或保存状况。`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            material: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["name", "material", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Photo Analysis Error:", error);
    throw error;
  }
};

/**
 * Analyzes an artifact LINE DRAWING (Wireframe) to estimate dimensions based on scale bars.
 */
export const analyzeArtifactDrawing = async (base64Image: string): Promise<any> => {
  try {
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash is usually sufficient for OCR/Scale reading
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(base64Image)
            }
          },
          {
            text: `你是一位专业的考古学家。这是一张考古出土器物的线图（Drawing），图中通常包含比例尺。
            请根据图中的比例尺或标注，估算器物的物理尺寸。
            
            请返回一个 JSON 对象，包含：
            - dimensions: 格式化的尺寸字符串 (例如: "通高: 20cm, 口径: 15cm, 底径: 8cm")。
            
            如果图中没有比例尺或无法判断，请返回空字符串。`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dimensions: { type: Type.STRING },
          },
          required: ["dimensions"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Drawing Analysis Error:", error);
    throw error;
  }
};
