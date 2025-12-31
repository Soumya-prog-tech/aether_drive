
import { File, Folder, CheckCircle2 } from "lucide-react";

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
        relative group cursor-pointer transition-all duration-200
        rounded-xl border overflow-hidden
        ${selected
          ? "border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
          : "border-gray-800 bg-[#1e293b]/40 hover:bg-[#1e293b]/80 hover:border-gray-600 hover:shadow-lg hover:-translate-y-0.5"
        }
      `}
    >
      {/* Thumbnail / Icon Container */}
      <div className="aspect-[4/3] w-full relative flex items-center justify-center bg-[#0f172a]/30">
        {item.type === "folder" ? (
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Folder size={24} />
          </div>
        ) : item.thumbnail ? (
          <img
            src={item.thumbnail.data}
            alt={item.name}
            className="w-16 h-16 object-contain rounded-lg shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gray-700/50 text-gray-400 flex items-center justify-center">
            <File size={24} />
          </div>
        )}

        {/* Checkbox Overlay (Selection Mode) */}
        {selectionMode && item.type === "file" && (
          <div className="absolute inset-0 bg-black/20 flex items-start justify-end p-2">
            <div
              className={`
                w-5 h-5 rounded-full border flex items-center justify-center transition-all bg-[#0f172a]
                ${selected ? "bg-blue-500 border-blue-500" : "border-gray-500"}
              `}
            >
              {selected && <CheckCircle2 size={12} className="text-white" />}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-800/50 bg-[#1e293b]/50">
        <p className="text-xs font-medium text-gray-200 truncate" title={item.name}>
          {item.name || "Unnamed"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            {item.type}
          </span>
        </div>
      </div>
    </div>
  );
};

