
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
  size?: number;
  updatedAt?: string;
}

interface Props {
  item: Item;
  selected: boolean;
  selectionMode: boolean;
  onOpenFolder: (id: string) => void;
  onToggleSelect: (item: Item) => void;
  onDownload: (item: Item) => void;
}

const formatSize = (bytes?: number) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

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
        rounded-lg border overflow-hidden
        ${selected
          ? "border-blue-500 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
          : "border-gray-800 bg-[#1e293b]/40 hover:bg-[#1e293b]/80 hover:border-gray-600 hover:shadow-md hover:-translate-y-0.5"
        }
      `}
    >
      {/* Thumbnail / Icon Container */}
      <div className="aspect-[3/2] w-full relative flex items-center justify-center bg-[#0f172a]/50">
        {item.type === "folder" ? (
          <div className="transition-transform group-hover:scale-110 duration-200">
            <Folder size={40} className="text-blue-400 fill-blue-500/20" />
          </div>
        ) : item.thumbnail ? (
          <img
            src={item.thumbnail.data}
            alt={item.name}
            className="h-2/3 w-auto object-contain drop-shadow-md transition-transform group-hover:scale-105 duration-200"
          />
        ) : (
          <div className="transition-transform group-hover:scale-110 duration-200">
            <File size={36} className="text-gray-500" />
          </div>
        )}

        {/* Checkbox Overlay (Selection Mode) */}
        {selectionMode && item.type === "file" && (
          <div className="absolute inset-0 bg-black/10 flex items-start justify-end p-1.5">
            <div
              className={`
                w-4 h-4 rounded-full border flex items-center justify-center transition-all bg-[#0f172a]
                ${selected ? "bg-blue-500 border-blue-500" : "border-gray-500"}
              `}
            >
              {selected && <CheckCircle2 size={10} className="text-white" />}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 border-t border-gray-800/50 bg-[#1e293b]/50">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-gray-200 truncate leading-none" title={item.name}>
            {item.name || "Unnamed"}
          </p>
        </div>

        {/* Metadata Subtext */}
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500 font-medium leading-none">
          <span className="uppercase tracking-wider text-gray-500/80">
            {item.name?.split('.').pop()?.substring(0, 4) || item.type}
          </span>
          {item.type === "file" && (
            <>
              <span className="text-gray-700">·</span>
              <span>{formatSize(item.size)}</span>
              {item.updatedAt && (
                <>
                  <span className="text-gray-700">·</span>
                  <span>{formatDate(item.updatedAt)}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
