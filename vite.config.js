import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'

function agnesProxyMiddleware(env) {
  const API_KEY = env.AGNES_API_KEY || '';
  const HOST = 'apihub.agnes-ai.com';
  const PATH = '/v1/chat/completions';

  return (req, res, next) => {
    if (req.url !== '/api/analyze' || req.method !== 'POST') return next();

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { image, prompt } = JSON.parse(body);
        const requestBody = JSON.stringify({
          model: 'agnes-2.0-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
              { type: 'text', text: prompt },
            ]
          }],
          stream: true,
        });

        const proxyReq = https.request({
          hostname: HOST, port: 443, path: PATH, method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          console.error('Agnes API 请求失败:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AI 服务暂时不可用，请稍后重试' }));
        });

        proxyReq.write(requestBody);
        proxyReq.end();
      } catch (err) {
        console.error('请求解析失败:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '请求格式错误' }));
      }
    });
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), { name: 'agnes-proxy', configureServer(server) { server.middlewares.use(agnesProxyMiddleware(env)); } }],
    css: { modules: { localsConvention: 'camelCase' } },
  };
});
