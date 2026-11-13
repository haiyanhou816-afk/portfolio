import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Upload, Image as ImageIcon, X, ArrowLeft, Sparkles, Tag, Clock, Trash2 } from 'lucide-react';

// ========== IndexedDB 工具 ==========
const DB_NAME = 'InspirationGalleryDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllImages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror = () => reject(req.error);
  });
}

async function addImage(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteImage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// 文件/Blob 转为 data URL
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function InspirationGallery({ onBack }) {
  const [images, setImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredImages, setFilteredImages] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showPasteHint, setShowPasteHint] = useState(false);
  const galRef = useRef(null);

  // ---- 刷新列表 ----
  const reloadImages = useCallback(async () => {
    const list = await getAllImages();
    setImages(list);
    setFilteredImages(null);
  }, []);

  const initializedRef = useRef(false);

  /*
   * 灵感库只读本地 IndexedDB。
   * 原来这里会 fetch /inspiration/manifest.json 预载一批图片，
   * 但那些图来自 Dribbble / 站酷 / 花瓣，不是本人作品，
   * 随站点公开发布并不合适，所以预设图连同 public/inspiration 一起移除了。
   * 需要用的时候自己拖拽或 Ctrl+V 粘贴即可，数据只留在本地浏览器。
   */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    getAllImages()
      .then(setImages)
      .catch((err) => console.error('读取本地灵感库失败:', err));
  }, []);

  // ---- 添加图片（统一入口） ----
  const addToGallery = useCallback(async (fileOrBlob) => {
    if (!fileOrBlob || !(fileOrBlob instanceof Blob) || !fileOrBlob.type.startsWith('image/')) return;
    try {
      const dataUrl = await blobToDataUrl(fileOrBlob);
      await addImage({
        description: `灵感 #${Date.now()}`,
        tags: ['灵感'],
        dataUrl,
        createdAt: new Date().toISOString(),
        source: 'upload',
      });
      reloadImages();
    } catch (e) {
      console.error('添加失败:', e);
    }
  }, [reloadImages]);

  // ---- 搜索过滤 ----
  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredImages(null); return; }
    const q = searchQuery.toLowerCase();
    const r = images.filter(
      (img) =>
        img.description?.toLowerCase().includes(q) ||
        img.tags?.some((t) => t.toLowerCase().includes(q))
    );
    setFilteredImages(r);
  }, [searchQuery, images]);

  const currentList = filteredImages !== null ? filteredImages : images;

  // ---- 拖拽绑定（仅绑定到主容器，整个页面都可以拖） ----
  const handleGlobalDragOver = useCallback((e) => {
    e.preventDefault();
    // 不设置 dragOver 状态以免遮罩闪烁
  }, []);

  const handleGlobalDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) addToGallery(file);
    }
  }, [addToGallery]);

  useEffect(() => {
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);
    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, [handleGlobalDragOver, handleGlobalDrop]);

  // ---- 全局粘贴 ----
  useEffect(() => {
    const handlePaste = (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      // 方法1: 从 items 获取图片
      for (let i = 0; i < clipboardData.items?.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) addToGallery(blob);
          setShowPasteHint(true);
          setTimeout(() => setShowPasteHint(false), 2000);
          return;
        }
      }

      // 方法2: 从 files 获取图片（mac 截图粘贴通常走这里）
      const dtFiles = clipboardData.files;
      if (dtFiles && dtFiles.length > 0) {
        for (let i = 0; i < dtFiles.length; i++) {
          if (dtFiles[i].type.startsWith('image/')) {
            e.preventDefault();
            addToGallery(dtFiles[i]);
            setShowPasteHint(true);
            setTimeout(() => setShowPasteHint(false), 2000);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addToGallery]);

  // ---- 文件选择器 ----
  const triggerFilePicker = useCallback(() => {
    document.getElementById('inspiration-file-input')?.click();
  }, []);

  const handleFileSelect = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      if (f) addToGallery(f);
      e.target.value = '';
    },
    [addToGallery]
  );

  // ---- 删除 ----
  const handleDelete = useCallback(
    async (id) => {
      await deleteImage(id);
      if (selectedImage?.id === id) setSelectedImage(null);
      reloadImages();
    },
    [selectedImage, reloadImages]
  );

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-base)]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1700px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight">灵感宝库</h1>
          <p className="text-xs text-[var(--text-dim)] hidden sm:flex items-center justify-end gap-1.5">
            <ImageIcon size={13} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
            <span>拖拽任意位置 · Ctrl+V 粘贴 · 点击上传</span>
          </p>
        </div>
      </header>

      {/* 粘贴成功提示 */}
      <AnimatePresence>
        {showPasteHint && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-[var(--text-main)] px-6 py-2 rounded-full text-sm shadow-lg"
          >
            ✓ 已添加图片
          </motion.div>
        )}
      </AnimatePresence>

      {/* 拖拽大背景遮罩 */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center bg-[var(--bg-base)]/50 backdrop-blur-md"
          >
            <div className="text-center">
              <Upload size={64} className="mx-auto mb-4 text-[var(--text-main)]/60" />
              <p className="text-[var(--text-main)]/70 text-2xl font-light">释放以添加灵感图片</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-16" ref={galRef}>
        <div className="max-w-[1700px] mx-auto px-6 md:px-12 mb-8">
          {/* 搜索 */}
          <div className="flex gap-3 mb-8">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索灵感... "
                className="w-full pl-12 pr-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            {searchQuery.trim() && (
              <button onClick={() => setSearchQuery('')} className="px-4 py-3 bg-white/[0.1] rounded-xl text-sm text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/[0.2] transition-colors">
                清除
              </button>
            )}
          </div>

          {/* 上传卡片 */}
          <div
            onClick={triggerFilePicker}
            className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
              dragOver ? 'border-white bg-white/[0.05]' : 'border-white/10 hover:border-white/30'
            }`}
          >
            <input
              id="inspiration-file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center justify-between p-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                  <Upload size={24} className="text-[var(--text-sub)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">拖放图片到这里，或点击上传</p>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5">PNG / JPG / WebP / GIF — 任何位置粘贴 Ctrl+V 也可以</p>
                </div>
              </div>
              <div className="text-gray-700 text-xs font-mono">{images.length} 张</div>
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div className="max-w-[1700px] mx-auto px-6 md:px-12 mb-6">
          <p className="text-xs text-[var(--text-dim)]">
            {searchQuery.trim() ? `找到 ${currentList.length} 张相关灵感` : `共 ${images.length} 张图片`}
          </p>
        </div>

        {/* 瀑布流 */}
        <div className="max-w-[1700px] mx-auto px-6 md:px-12">
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            <AnimatePresence>
              {currentList.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  transition={{ duration: 0.3 }}
                  className="break-inside-avoid group relative"
                >
                  <div
                    className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                    onClick={() => setSelectedImage(img)}
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.description}
                      className="w-full transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* 始终可见的删除按钮 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                    title="删除此图片"
                    className="absolute top-2 right-2 z-10 w-8 h-8 bg-[var(--bg-base)]/60 hover:bg-red-600 rounded-lg flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 空状态 */}
          {!images.length && (
            <div className="flex flex-col items-center justify-center py-32 text-[var(--text-dim)]">
              <ImageIcon size={48} className="mb-4 opacity-30" />
              <p className="text-sm">还没有灵感图片</p>
              <p className="text-xs mt-1">拖拽、粘贴一张图片开始收藏</p>
            </div>
          )}
        </div>
      </main>

      {/* 大图预览 Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] bg-[var(--bg-base)]/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[90vw] max-h-[90vh] bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border-subtle)]"
            >
              <div className="relative flex items-center justify-center bg-[var(--bg-base)]" style={{ maxHeight: '60vh' }}>
                <img src={selectedImage.dataUrl} alt="" className="max-w-full max-h-[60vh] object-contain" />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-[var(--text-dim)]" />
                      <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">描述</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedImage.description}</p>
                  </div>
                  <button onClick={() => setSelectedImage(null)} className="w-8 h-8 flex-shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                  {selectedImage.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedImage.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] text-[var(--text-dim)]">{tag}</span>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-[var(--text-dim)] flex items-center gap-1 ml-auto">
                    <Clock size={10} />
                    {new Date(selectedImage.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleDelete(selectedImage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={12} /> 删除
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
