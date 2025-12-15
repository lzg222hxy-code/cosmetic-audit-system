import { GoogleGenAI } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { AuditContext, AuditResponse } from "../types";

// 设置 PDF.js Worker
// 使用 CDN 版本的 Worker 以避免本地构建时的文件路径复杂性
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// --- 辅助函数 ---

const cleanJsonString = (str: string): string => {
  const jsonBlockMatch = str.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();

  const firstOpen = str.indexOf('{');
  const lastClose = str.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    return str.substring(firstOpen, lastClose + 1);
  }

  return str.replace(/```json\n?|\n?```/g, "").trim();
};

/**
 * 浏览器端 PDF 转文本核心函数
 */
const extractTextFromPdf = async (base64Data: string): Promise<string> => {
  try {
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    return fullText;
  } catch (e) {
    console.error("PDF Extraction Failed:", e);
    throw new Error("PDF 文本提取失败，请确保文件未加密。如果问题持续，请尝试使用文本范本模式。");
  }
};

// --- Prompt 构建 ---

const buildSystemPrompt = (equipmentJson: string) => `
你现在的身份是：**资深化妆品工艺工程师（乳化/制造方向）**，同时也是精通**中国《化妆品生产质量管理规范》(GMPC)** 的合规审核专家。

你将接收到 **1个 或 2个** 文件的内容（可能是PDF原文或提取的文本）。
*   **文件1 (必需)**: “生产单据”（包含半成品批生产配料单 + 生产工艺记录）。
*   **文件2 (可选)**: “注册备案资料”（包含申报的配方和工艺简述）。

请严格按照以下**五大核心维度**进行逻辑校验。任何不满足要求的地方，必须作为【Issue】指出。

### 第一维度：半成品批生产配料单审核 (基于文件1)
1.  **总量核查**：所有原料百分比 (%) 加总必须严格等于 **100%**。否则标记为 **ERROR**。
2.  **量值复核**：理论配方量 = 计划量 × (% / 100)。与单据上的“配方量”对比 (允许±0.01kg误差)。
3.  **摘要一致性**：检查“要事摘要/注意事项”是否与下文工艺描述矛盾。

### 第二维度：生产工艺记录审核 (基于文件1)
1.  **工艺描述清晰度 (GMPC)**：严禁使用“适量”、“少许”、“适度”等模糊词汇。标记为 **WARNING**。
2.  **原料一致性**：工艺步骤中提及的原料、代码、重量，必须与配料单完全一致。否则标记为 **ERROR**。
3.  **乳化逻辑**：检查油水相混合温差（通常<5℃），热敏原料加入温度（通常<45℃）。

### 第三维度：设备参数智能校验 (基于文件1 vs 设备库)
参考以下【工厂设备档案库】：
${equipmentJson}

1.  **识别设备**：从文件1中识别设备编码。
2.  **越限判定**：如果设定值超出设备 Min/Max 范围，标记为 **ERROR**。

### 第四维度：备案一致性核查 (CRITICAL - 仅当提供文件2时执行)
**如果提供了第二个文件（备案资料），请务必执行此步骤，否则跳过。**
你的任务是：**找茬**。对比【生产单据(文件1)】和【备案资料(文件2)】。
1.  **配方一致性**：
    *   检查文件1中的每一项原料名称、百分比，是否与文件2中的备案配方**完全一致**。
    *   *判定*：原料名称不一致（哪怕是别名不规范）、百分比有任何偏差，直接标记为 **ERROR** (标题: 备案配方不一致)。
2.  **工艺一致性**：
    *   对比关键工艺参数（如：乳化温度、均质时间、pH控制范围）。
    *   *判定*：如果生产记录的参数超出了备案资料规定的范围，标记为 **ERROR** (标题: 工艺参数偏离备案)。

### 第五维度：合规性输出
*   引用 GMPC 法规条款解释问题。
*   输出格式必须为 **纯 JSON**。

---
**输出格式要求**：
{
  "summary": "简短总结。如果有备案文件，请明确说明'已进行备案一致性比对'。",
  "detectedEquipment": "识别到的设备编码",
  "complianceScore": 0-100 (整数),
  "gmpcNotes": "合规建议",
  "issues": [
    {
      "type": "error" | "warning" | "info",
      "category": "formula" | "process" | "consistency" | "equipment" | "regulatory",
      "title": "问题标题",
      "description": "详细描述 (若为备案问题，请写明：备案值vs生产值)",
      "location": "问题位置"
    }
  ]
}
`;

// --- Service Implementation ---

const callGemini = async (context: AuditContext, apiKey: string, systemInstruction: string, promptText: string) => {
    const clientOptions: any = { apiKey };
    if (context.settings.baseUrl) {
        clientOptions.baseUrl = context.settings.baseUrl;
    }
    const ai = new GoogleGenAI(clientOptions);

    const parts: any[] = [];
    if (context.fileBase64) parts.push({ inlineData: { mimeType: 'application/pdf', data: context.fileBase64 } });
    if (context.filingFileBase64) parts.push({ inlineData: { mimeType: 'application/pdf', data: context.filingFileBase64 } });
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
        model: context.settings.modelName || "gemini-2.5-flash",
        contents: { parts },
        config: { systemInstruction, responseMimeType: "application/json" },
    });
    return response.text;
};

const callDeepSeek = async (context: AuditContext, apiKey: string, systemInstruction: string, promptText: string) => {
    let fullContent = promptText + "\n\n";
    
    if (context.fileBase64) {
        fullContent += "【文件1：生产单据内容】\n" + await extractTextFromPdf(context.fileBase64) + "\n\n";
    }
    if (context.filingFileBase64) {
        fullContent += "【文件2：注册备案资料内容】\n" + await extractTextFromPdf(context.filingFileBase64) + "\n\n";
    }

    const baseUrl = context.settings.baseUrl || "https://api.deepseek.com";
    const apiUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const model = context.settings.modelName || "deepseek-chat";

    const payload = {
        model: model,
        messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: fullContent }
        ],
        stream: false,
        response_format: { type: "json_object" } 
    };

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`DeepSeek API Error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "{}";
};

// --- Main Entry Point ---

export const auditProcess = async (
  context: AuditContext,
  defaultApiKey: string
): Promise<AuditResponse> => {
  const apiKey = context.settings.apiKey || defaultApiKey;

  if (!apiKey) {
    throw new Error(`请配置 ${context.settings.provider === 'deepseek' ? 'DeepSeek' : 'Google'} API Key。`);
  }

  const equipmentJson = JSON.stringify(context.equipmentProfiles.map(p => ({
    code: p.code,
    name: p.name,
    limits: p.parameters.map(l => ({ name: l.name, min: l.min, max: l.max, unit: l.unit }))
  })), null, 2);

  const systemInstruction = buildSystemPrompt(equipmentJson);
  
  let fileDescription = "【文件内容说明】\n";
  if (context.filingFileBase64) {
      fileDescription += "你收到了两个文件内容（生产单据 + 备案资料）。请执行'第四维度：备案一致性核查'。";
  } else {
      fileDescription += "你只收到了一份文件（生产单据）。请跳过'备案一致性核查'。";
  }

  const promptText = `
${fileDescription}
【DEMO 文本数据 (仅当无法读取PDF时参考)】
${context.textData ? context.textData : "无额外文本数据。"}
`;

  try {
    let rawJson = "{}";

    if (context.settings.provider === 'deepseek') {
        rawJson = await callDeepSeek(context, apiKey, systemInstruction, promptText);
    } else {
        rawJson = (await callGemini(context, apiKey, systemInstruction, promptText)) || "{}";
    }
    
    try {
      return JSON.parse(cleanJsonString(rawJson)) as AuditResponse;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Text:", rawJson);
      throw new Error("AI 返回的数据格式无法解析，建议重试。");
    }

  } catch (error: any) {
    console.error("Audit Service Error:", error);
    let errorMsg = error.message || "审核服务发生未知错误。";
    if (errorMsg.includes('PDF')) {
        errorMsg = "PDF 解析失败: 可能是加密文件或扫描件(无文字层)。DeepSeek 模式下需要可复制文字的 PDF。";
    }
    throw new Error(errorMsg);
  }
};