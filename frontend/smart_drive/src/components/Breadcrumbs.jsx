import React from "react";
import { Home, ChevronRight } from "lucide-react";

const Breadcrumbs = ({ path, onNavigate }) => {
  return (
    <nav
      className="flex items-center text-sm text-slate-600 mb-4 overflow-x-auto"
      aria-label="Breadcrumb"
    >
      {path.map((crumb, index) => {
        const isLast = index === path.length - 1;
        return (
          <React.Fragment key={crumb.id}>
            <button
              onClick={() => onNavigate(crumb.id, index)}
              className={`flex items-center gap-1 ${
                isLast
                  ? "font-semibold text-slate-800 cursor-default"
                  : "hover:text-sky-600 hover:underline"
              }`}
              disabled={isLast}
            >
              {index === 0 ? (
                <Home className="w-4 h-4" />
              ) : null}
              <span className="truncate max-w-[150px]" title={crumb.name}>
                {crumb.name}
              </span>
            </button>
            {!isLast && (
              <ChevronRight className="mx-2 w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
