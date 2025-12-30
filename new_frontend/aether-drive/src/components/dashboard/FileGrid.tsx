import { FileCard } from "./FileCard";
import { EmptyState } from "./EmptyState";

interface Item {
  id: string;
  type: "file" | "folder";
  name?: string;
}

interface Props {
  items: Item[];
  loading: boolean;
  selectedFiles: Item[];
  onOpenFolder: (id: string) => void;
  onToggleSelect: (item: Item) => void;
}

export const FileGrid = ({
  items,
  loading,
  selectedFiles,
  onOpenFolder,
  onToggleSelect,
}: Props) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((item) => (
        <FileCard
          key={item.id}
          item={item}
          selected={selectedFiles.some((f) => f.id === item.id)}
          onOpenFolder={onOpenFolder}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
};
