/**
 * 解析 public/ 下静态资源的实际 URL。
 *
 * 站点可能部署在子路径（如 GitHub Pages 的 /portfolio/），
 * 此时写死的 "/images/a.jpg" 会 404。统一经过这里拼上 Vite 的 BASE_URL。
 */
export function asset(path) {
  if (!path) return path;
  // 外链与 data URI 原样返回
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
}
