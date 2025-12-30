import React from 'react';
import FileIcon from './FileIcon';

const FileGrid = ({ files, onFileSelect }) => {
  if (!files || files.length === 0) {
    return <p className="text-center text-gray-500 mt-10">Your drive is empty. Upload a file to get started!</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => onFileSelect(file)}
          className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-500 cursor-pointer transition-all duration-200"
        >
          <FileIcon contentType={file.content_type} />
          <p className="mt-2 text-sm text-center text-gray-700 truncate w-full" title={file.original_filename}>
            {file.original_filename}
          </p>
        </div>
      ))}
    </div>
  );
};



export default FileGrid;