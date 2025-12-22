
import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  // 尝试多种方式获取 Key，兼容 Vite (Netlify常用) 和传统的 process.env
  // 注意：在 Vite 环境中，process 可能未定义，需做安全检查
  let apiKey = '';
  try {
      // @ts-ignore - 忽略 TS 检查 import.meta
      if (typeof import.meta !== 'undefined' && import.meta.env) {
          // @ts-ignore
          apiKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
      }
  } catch (e) {}

  if (!apiKey && typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || process.env.REACT_APP_API_KEY || '';
  }

  if (!apiKey) {
    console.warn("未检测到 API Key。AI 功能将不可用。请在 Netlify 环境变量中设置 VITE_API_KEY 或 API_KEY。");
    // 返回一个带空 Key 的实例，防止页面直接白屏崩溃，但在调用时会报错
    return new GoogleGenAI({ apiKey: 'MISSING_KEY' });
  }
  return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (base64Image: string) => base64Image.split(',')[1] || base64Image;

// --- DeepSeek / OpenAI Compatible Helper ---
const callDeepSeekAPI = async (modelId: string, systemPrompt: string, base64Image: string, jsonSchema: any) => {
    let apiKey = '';
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.DEEPSEEK_API_KEY;
        }
    } catch (e) {}
    
    if (!apiKey && typeof process !== 'undefined' && process.env) {
        apiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    if (!apiKey) {
        throw new Error("未配置 DeepSeek API Key (VITE_DEEPSEEK_API_KEY 或 DEEPSEEK_API_KEY)");
    }

    const messages = [
        { role: "system", content: systemPrompt },
        {
            role: "user",
            content: [
                { type: "text", text: "请分析这张图片，并按 JSON 格式输出结果。" },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${cleanBase64(base64Image)}`
                    }
                }
            ]
        }
    ];

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                response_format: { type: "json_object" }, // DeepSeek supports JSON mode
                temperature: 1.0
            })
        });

        if (!response.ok) {
            const err = await response.json();
            // Handle common DeepSeek/OpenAI vision limitation errors
            if (err?.error?.message?.includes("vision") || err?.error?.message?.includes("image")) {
                throw new Error("该 DeepSeek 模型暂时不支持图片输入，请使用 Gemini 模型。");
            }
            throw new Error(`DeepSeek API Error: ${err?.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) return null;
        
        // Ensure we parse valid JSON (sometimes models add markdown backticks)
        const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("DeepSeek Call Failed:", error);
        throw error;
    }
};

/**
 * Analyzes an artifact PHOTO to suggest metadata.
 * Routes to DeepSeek or Gemini based on modelId.
 */
export const analyzeArtifactPhoto = async (base64Image: string, modelId: string = "gemini-3-flash-preview"): Promise<any> => {
  // Route to DeepSeek if selected
  if (modelId.startsWith('deepseek')) {
      return callDeepSeekAPI(
          modelId,
          `你是一位专业的考古学家。请分析用户提供的文物照片，并返回一个合法的 JSON 对象。
           必须严格包含以下字段：
           - name: 器物名称
           - material: 质地
           - description: 简短专业描述 (100字以内)
           不需要推测尺寸。请确保输出为纯 JSON。`,
          base64Image,
          null
      );
  }

  // Default: Gemini Logic
  try {
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: modelId,
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
 * Analyzes an artifact LINE DRAWING (Wireframe).
 */
export const analyzeArtifactDrawing = async (base64Image: string, modelId: string = "gemini-3-flash-preview"): Promise<any> => {
  // Route to DeepSeek if selected
  if (modelId.startsWith('deepseek')) {
      return callDeepSeekAPI(
          modelId,
          `你是一位专业的考古学家。分析考古器物线图（Drawing）及比例尺。
           请返回 JSON 对象，包含：
           - dimensions: 格式化的尺寸字符串 (例如: "通高: 20cm")。
           如果无法判断，dimensions 返回空字符串。`,
          base64Image,
          null
      );
  }

  try {
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: modelId, 
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
