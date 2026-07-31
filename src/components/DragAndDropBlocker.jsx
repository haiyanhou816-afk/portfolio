import { useEffect, useRef } from 'react';

// Global flag: true when no pet is ready to receive drops
let blockGlobally = true;

// Expose toggles for DesktopPet
window.__pet__setBlock = (v) => { blockGlobally = v; };

export default function DragAndDropBlocker() {
  // Add global listener that blocks drop ONLY when no pet claims the event
  useEffect(() => {
    const onDragOver = (e) => {
      if (!blockGlobally) return;
      e.preventDefault();
    };

    const onDrop = (e) => {
      // Only block if no pet claimed it yet (check if dataTransfer still has files)
      if (blockGlobally && e.dataTransfer?.files?.length > 0) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('dragover', onDragOver, false);
    document.addEventListener('drop', onDrop, false);

    return () => {
      document.removeEventListener('dragover', onDragOver, false);
      document.removeEventListener('drop', onDrop, false);
    };
  }, []);

  return null;
}
