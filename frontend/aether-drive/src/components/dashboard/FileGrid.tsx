import { FileCard } from "./FileCard";
import { EmptyState } from "./EmptyState";
import { Loader2 } from "lucide-react";

interface Thumbnail {
  type: "image" | "icon";
  mime: string;
  data: string;
}

interface Item {
  id: string;
  type: "file" | "folder";
  name?: string;
  thumbnail?: Thumbnail;
}

interface Props {
  items: Item[];
  loading: boolean;
  selectedFiles: Item[];
  selectionMode: boolean;
  onOpenFolder: (id: string) => void;
  onToggleSelect: (item: Item) => void;
  onDownload: (item: Item) => void;
}

export const FileGrid = ({
  items,
  loading,
  selectedFiles,
  selectionMode,
  onOpenFolder,
  onToggleSelect,
  onDownload,
}: Props) => {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-sm font-medium">Loading your secure files...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="p-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {items.map((item) => (
          <FileCard
            key={item.id}
            item={item}
            selected={selectedFiles.some((f) => f.id === item.id)}
            selectionMode={selectionMode}
            onOpenFolder={onOpenFolder}
            onToggleSelect={onToggleSelect}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  );
};


