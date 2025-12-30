// src/hooks/useSelection.ts
import { useState } from "react";

export const useSelection = () => {
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  const toggleSelect = (item: any) => {
    setSelectedFiles((prev) =>
      prev.find((f) => f.id === item.id)
        ? prev.filter((f) => f.id !== item.id)
        : [...prev, item]
    );
  };

  return {
    selectedFiles,
    toggleSelect,
    clearSelection: () => setSelectedFiles([]),
  };
};
