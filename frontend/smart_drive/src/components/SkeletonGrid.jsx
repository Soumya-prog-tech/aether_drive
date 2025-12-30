// SkeletonGrid.jsx
import React from "react";

const SkeletonGrid = () => {
  const skeletons = Array.from({ length: 12 }); // number of placeholder items
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-pulse">
      {skeletons.map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-gray-100"
        >
          <div className="w-14 h-14 bg-gray-300 rounded-lg" />
          <div className="w-20 h-4 bg-gray-300 rounded mt-2" />
        </div>
      ))}
    </div>
  );
};

export default SkeletonGrid;
