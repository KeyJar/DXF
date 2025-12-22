
import { GoogleGenAI } from "@google/genai";

// Constants
export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Google)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Google)' },
  { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoning)' },
  { id: 'doubao-pro-4k', name: 'Doubao Pro (需Endpoint ID)' }, // User needs to use custom ID for actual EP
];

export const DEFAULT_MODEL = 'gemini-3-flash-preview';

// Helper to clean base64 string
const cleanBase64 = (base64: string) => {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

// Helper to get client (creates new instance if custom settings are needed in future)
const getClient = () => {
    // API Key must be provided via environment variable process.env.API_KEY
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

// Helper for OpenAI-compatible APIs (DeepSeek, Doubao/Ark, etc.)
const callOpenAICompatible = async (
    messages: any[], 
    modelId: string, 
    jsonMode: boolean = false
) => {
    let baseUrl = 'https://api.deepseek.com/chat/completions';
    
    // Volcengine Ark (Doubao) Endpoint Logic
    if (modelId.includes('doubao') || modelId.startsWith('ep-')) {
        baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    }

    const apiKey = process.env.API_KEY; // Assumes the user switched the key to match the provider

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                stream: false,
                response_format: jsonMode ? { type: 'json_object' } : undefined
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Provider API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error) {
        console.error("OpenAI Compatible Call Error:", error);
        throw error;
    }
};

/**
 * Chat with AI Assistant
 */
export const sendMessageToAI = async (
    message: string, 
    history: {role: 'user' | 'model', content: string}[] = [],
    modelId: string = DEFAULT_MODEL
) => {
    // Dispatch to appropriate provider
    if (!modelId.startsWith('gemini') && !modelId.startsWith('veo')) {
        // Use OpenAI Compatible format for DeepSeek/Doubao
        const messages = [
            { role: "system", content: "你是一位专业的考古学助手。你可以回答关于考古发掘、文物分类、器物描述、绘图标准以及文物保护相关的问题。你的回答应当专业、严谨且精炼。" },
            ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
            { role: "user", content: message }
        ];
        return await callOpenAICompatible(messages, modelId);
    }

    // Default: Google Gemini
    try {
        const ai = getClient();
        const chat = ai.chats.create({
            model: modelId,
            config: {
                systemInstruction: "你是一位专业的考古学助手。你可以回答关于考古发掘、文物分类、器物描述、绘图标准以及文物保护相关的问题。你的回答应当专业、严谨且精炼。",
            },
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.content }]
            }))
        });

        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("AI Chat Error:", error);
        throw error;
    }
};

/**
 * Analyze artifact photo to extract information
 */
export const analyzeArtifactPhoto = async (
    base64Image: string, 
    categoryType: '陶器' | '小件',
    modelId: string = DEFAULT_MODEL
): Promise<any> => {
  
  // Prompt logic
  let promptText = `Analyze this archaeological artifact image. Return a JSON object (NO markdown formatting, RAW JSON only) with the following fields in Chinese (Simplified):
  - name: Suggested artifact name (e.g. 陶罐, 骨锥).
  - material: Suggested material.
  - condition: Preservation condition (完整, 残缺, etc.).
  - description: A detailed archaeological description (visual features, shape).
  `;

  if (categoryType === '陶器') {
    promptText += `
    Since this is Pottery, also estimate:
    - potteryTexture: Texture (e.g. 夹砂, 泥质).
    - potteryColor: Color class (e.g. 红陶, 灰陶).
    - decoration: Surface patterns/decoration (e.g. 绳纹, 素面).
    `;
  }

  // Dispatch to non-Google providers
  if (!modelId.startsWith('gemini') && !modelId.startsWith('veo')) {
      // Construct OpenAI Vision payload
      // Note: DeepSeek V3/R1 typically DOES NOT support vision directly via standard chat endpoint yet.
      // This might fail if the model is not multimodal.
      const messages = [
          {
              role: "user",
              content: [
                  { type: "text", text: promptText },
                  { type: "image_url", image_url: { url: base64Image } } // base64Image already contains data:image/... prefix usually
              ]
          }
      ];
      
      try {
        const jsonStr = await callOpenAICompatible(messages, modelId, true);
        // Clean markdown code blocks if present
        const cleaned = jsonStr.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleaned);
      } catch (e: any) {
          if (e.message?.includes('400')) {
              throw new Error("该模型（如 DeepSeek）可能不支持图片分析，请切换回 Gemini。");
          }
          throw e;
      }
  }

  // Google Gemini Logic
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64(base64Image) } },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI returned empty response");
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};

/**
 * Measure artifact dimensions from drawing
 */
export const analyzeArtifactDrawing = async (
    base64Image: string,
    modelId: string = DEFAULT_MODEL
): Promise<any> => {
  
  const promptText = `Analyze this archaeological technical drawing (line drawing). 
  Look for a scale bar or ruler in the image. 
  Estimate the physical dimensions of the artifact shown.
  Return a JSON object (NO markdown) with:
  - dimensions: A string formatted like "长: 10cm, 宽: 5cm" or "口径: 12cm, 通高: 15cm" based on the object type. 
  - reasoning: Brief explanation of how you estimated it.
  If no scale is visible, make a best guess based on typical artifacts of this shape but note it is an estimate.`;

  // Dispatch to non-Google providers
  if (!modelId.startsWith('gemini') && !modelId.startsWith('veo')) {
      const messages = [
          {
              role: "user",
              content: [
                  { type: "text", text: promptText },
                  { type: "image_url", image_url: { url: base64Image } }
              ]
          }
      ];
      try {
        const jsonStr = await callOpenAICompatible(messages, modelId, true);
        const cleaned = jsonStr.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleaned);
      } catch (e: any) {
         if (e.message?.includes('400')) {
              throw new Error("该模型可能不支持图片分析，请切换回 Gemini。");
          }
          throw e;
      }
  }

  // Google Gemini Logic
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64(base64Image) } },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI returned empty response");
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Measurement Error:", error);
    throw error;
  }
};
