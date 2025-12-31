import { useState } from "react";

export const useSelection = () => {
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelect = (item: any) => {
    setSelectedFiles((prev) =>
      prev.find((f) => f.id === item.id)
        ? prev.filter((f) => f.id !== item.id)
        : [...prev, item]
    );
  };

  const selectAll = (items: any[]) => {
    // Only select files, not folders
    const files = items.filter((item) => item.type === "file");
    setSelectedFiles(files);
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedFiles([]);
  };

  return {
    selectedFiles,
    isSelectionMode,
    toggleSelect,
    selectAll,
    enterSelectionMode,
    exitSelectionMode,
    clearSelection: () => setSelectedFiles([]),
  };
};

