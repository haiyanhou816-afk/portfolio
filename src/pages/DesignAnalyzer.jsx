import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import AnalysisReport from '../components/AnalysisReport';
import { analyzeDesign } from '../utils/analyzer';

export default function DesignAnalyzer({ onBack }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [report, setReport] = useState('');
  const [status, setStatus] = useState('idle'); // idle | analyzing | done | error
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleImageSelected = useCallback((file) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setReport('');
    setError('');
    setStatus('analyzing');

    analyzeDesign(
      file,
      (chunk) => setReport((prev) => prev + chunk),
      (err) => {
        setError(err);
        setStatus('error');
      },
      () => setStatus('done')
    );
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setImage(null);
    setImagePreview(null);
    setReport('');
    setStatus('idle');
    setError('');
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 md:px-8 lg:px-12 xl:px-16">
      <div className="max-w-[900px] mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-4 mb-12">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2 rounded-lg text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-white">Design</span>
              <span className="font-mono font-light text-gray-500 ml-2">Analyzer</span>
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">上传设计稿，AI 自动生成完整的设计解读报告</p>
          </div>

          {/* 操作按钮 */}
          <div className="ml-auto flex gap-2">
            {report && status === 'done' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? '已复制' : '复制报告'}
              </motion.button>
            )}
            {image && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-white transition-colors"
              >
                重新上传
              </motion.button>
            )}
          </div>
        </div>

        {/* 上传区域 */}
        {!imagePreview && (
          <ImageUpload onImageSelected={handleImageSelected} disabled={status === 'analyzing'} />
        )}

        {/* 图片预览 */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full rounded-2xl border border-white/10 overflow-hidden mb-10"
            >
              <img
                src={imagePreview}
                alt="待分析设计稿"
                className="w-full max-h-[400px] object-contain bg-black/20"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 加载状态 */}
        {status === 'analyzing' && !report && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-violet-500/60"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">AI 正在解读你的设计稿...</p>
          </div>
        )}

        {/* 错误状态 */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-red-400/80 text-sm mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              重试
            </button>
          </motion.div>
        )}

        {/* 分析报告 */}
        <AnalysisReport content={report} isStreaming={status === 'analyzing'} />
      </div>
    </div>
  );
}
