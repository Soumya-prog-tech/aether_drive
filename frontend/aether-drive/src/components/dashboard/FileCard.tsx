import { File, Folder, CheckCircle2 } from "lucide-react";

interface Item {
  id: string;
  type: "file" | "folder";
  name?: string;
}

interface Props {
  item: Item;
  selected: boolean;
  selectionMode: boolean;
  onOpenFolder: (id: string) => void;
  onToggleSelect: (item: Item) => void;
  onDownload: (item: Item) => void;
}

export const FileCard = ({
  item,
  selected,
  selectionMode,
  onOpenFolder,
  onToggleSelect,
  onDownload,
}: Props) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (item.type === "folder") {
      onOpenFolder(item.id);
      return;
    }

    if (selectionMode) {
      onToggleSelect(item);
    } else {
      onDownload(item);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative p-4 rounded-xl border transition-all duration-200 group
        flex flex-col items-center justify-center gap-3 aspect-square
        ${selected
          ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          : "border-gray-800 bg-[#1e293b]/30 hover:bg-[#1e293b]/80 hover:border-gray-600 hover:shadow-lg hover:-translate-y-1"
        }
        cursor-pointer
      `}
    >
      {/* Checkbox (Only in Selection Mode) */}
      {selectionMode && item.type === "file" && (
        <div
          className={`
            absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-all
            ${selected ? "bg-blue-500 border-blue-500" : "border-gray-500 bg-gray-900/50"}
          `}
        >
          {selected && <CheckCircle2 size={12} className="text-white" />}
        </div>
      )}

      {/* Icon */}
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center transition-colors
        ${item.type === "folder" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}
      `}>
        {item.type === "folder" ? <Folder size={24} /> : <File size={24} />}
      </div>

      {/* Name */}
      <div className="text-center w-full px-2">
        <p className="text-sm font-medium text-gray-200 truncate w-full">
          {item.name || "Unnamed"}
        </p>
        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">
          {item.type}
        </p>
      </div>
    </div>
  );
};

