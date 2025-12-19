import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes an artifact image to suggest metadata.
 */
export const analyzeArtifactImage = async (base64Image: string): Promise<any> => {
  try {
    const ai = getAiClient();
    
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: `你是一位专业的考古学家。请分析这张文物照片，并返回一个 JSON 对象。
            请尝试识别以下字段：
            - name: 器物名称 (例如：彩陶罐, 青铜剑)
            - material: 质地 (例如：陶, 铜, 玉, 骨)
            - condition: 保存状况 (完整, 残缺, 碎片)
            - description: 对器物的纹饰、形状、风格的简短专业描述 (100字以内)
            
            如果无法确定，请根据视觉特征进行合理推测。`
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
            condition: { type: Type.STRING },
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
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};