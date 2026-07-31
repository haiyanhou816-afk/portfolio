import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon } from 'lucide-react';

export default function ImageUpload({ onImageSelected, disabled }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  }, [disabled, onImageSelected]);

  const handleFileInput = useCallback((e) => {
    if (disabled) return;
    const file = e.target.files[0];
    if (file) onImageSelected(file);
  }, [disabled, onImageSelected]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && document.getElementById('analyzer-file-input')?.click()}
        className={`
          relative w-full aspect-[16/9] max-h-[420px] rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center gap-4 cursor-pointer
          transition-all duration-500 group overflow-hidden
          ${disabled ? 'opacity-50 pointer-events-none' : 'hover:border-white/40'}
          border-white/10 bg-white/[0.02]
        `}
      >
        {/* 背景光晕 */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Upload size={28} className="text-gray-500 group-hover:text-white/60 transition-colors duration-500" />
          </div>
        </motion.div>

        <div className="text-center space-y-2 relative z-10">
          <p className="text-sm font-medium text-gray-400 group-hover:text-white/70 transition-colors duration-500">
            拖拽设计稿到此处，或点击上传
          </p>
          <p className="text-xs text-gray-600">
            支持 PNG / JPG / WebP，最大 10MB
          </p>
        </div>

        {/* 悬浮图标装饰 */}
        <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
          <ImageIcon size={48} />
        </div>
        <div className="absolute bottom-6 left-8 opacity-0 group-hover:opacity-10 transition-opacity duration-700">
          <ImageIcon size={36} />
        </div>

        <input
          id="analyzer-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </motion.div>
  );
}
