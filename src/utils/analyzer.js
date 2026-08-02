/**
 * 前端 API 调用层 — Agnes AI Vision 设计分析
 * 通过 Vite proxy 发送请求，API Key 在后端中间件注入
 */

/**
 * 分析接口地址。
 *
 * 默认走 Vite dev server 的 /api/analyze 中间件（API Key 在服务端注入）。
 * 静态部署（如 GitHub Pages）没有这个后端，此时可用 VITE_ANALYZE_API
 * 指向自建代理；未配置则视为功能不可用，直接给出明确提示。
 */
const API_BASE = import.meta.env.VITE_ANALYZE_API || (import.meta.env.DEV ? '/api/analyze' : '');

const PROMPT_TEMPLATE = `请按以下 6 个维度详细分析这张设计稿：

1. 设计类型：这是什么类型的设计？（UI / 品牌 / 运营海报 / Banner / 插画 等）
2. 视觉元素拆解：布局结构、色彩体系、字体层级、核心图形、视觉重心、留白处理
3. 需求背景推断：基于画面内容推断业务场景、目标用户、投放渠道
4. 设计目标：核心要解决的问题、要达成的效果
5. 设计决策解读：逐项解释关键视觉元素"为什么这样设计"（比如为什么用这个颜色、这种构图、这个字号层级）
6. 设计策略总结：一句话概括整体设计思路

请用中文输出，结构化、有层次，适当使用表格呈现对比信息。`;

function compressImage(file, maxSizeMB = 2) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 2048;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        const tryCompress = () => {
          const base64 = canvas.toDataURL('image/jpeg', quality);
          const sizeMB = (base64.length * 0.75) / (1024 * 1024);
          if (sizeMB <= maxSizeMB || quality <= 0.1) {
            resolve(base64);
          } else {
            quality -= 0.1;
            tryCompress();
          }
        };
        tryCompress();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analyzeDesign(imageFile, onChunk, onError, onDone) {
  try {
    if (!API_BASE) {
      throw new Error('当前为静态部署，AI 分析功能需要后端代理支持。请在本地运行 npm run dev 体验，或配置 VITE_ANALYZE_API。');
    }

    const base64 = await compressImage(imageFile);
    const base64Data = base64.split(',')[1];

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Data,
        prompt: PROMPT_TEMPLATE,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone(fullText);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            fullText += content;
            if (content) onChunk(content);
          } catch {}
        }
      }
    }
    onDone(fullText);
  } catch (err) {
    onError(err.message || '分析失败，请重试');
  }
}
