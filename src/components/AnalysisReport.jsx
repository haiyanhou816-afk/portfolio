import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AnalysisReport({ content, isStreaming }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, isStreaming]);

  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto mt-10"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-gray-600 ml-2 font-mono">design-analysis.md</span>
          {isStreaming && (
            <span className="ml-auto flex items-center gap-1 text-xs text-violet-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              分析中...
            </span>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6 prose prose-invert prose-sm max-w-none
          prose-headings:text-white/90 prose-headings:font-medium
          prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
          prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-white/80
          prose-p:text-gray-400 prose-p:leading-relaxed
          prose-strong:text-white/80
          prose-ul:text-gray-400 prose-li:marker:text-gray-600
          prose-table:text-sm prose-th:text-white/70 prose-td:text-gray-400
          prose-table:border-white/10 prose-th:border-white/10 prose-td:border-white/10
          prose-code:text-violet-400 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-blockquote:border-violet-500/30 prose-blockquote:text-gray-500
          [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {isStreaming && <div ref={bottomRef} />}
    </motion.div>
  );
}
