import React, { useState } from 'react'
// ✅ Updated imports: buff_to_b64 is needed for the salt
import { encryptFile, encryptMetadata, deriveFileKey, buff_to_b64 } from '../services/crypto'
import { api } from '../services/api'

const UploadModal = ({ isOpen, onClose, onUploadSuccess, encryptionKey, currentFolderId }) => {
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  const handleFileSelect = (newFiles) => {
    setFiles(Array.from(newFiles))
    setError('')
  }

  const handleDragEnter = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = e => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
      e.dataTransfer.clearData()
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!files.length) {
      setError('Please select a file.')
      return
    }
    
    if (!encryptionKey) {
      setError('Encryption key not found. Please log in again.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      for (const file of files) {
        // 1. Generate Random File Salt (16 bytes)
        const fileSalt = window.crypto.getRandomValues(new Uint8Array(16));

        // 2. Derive Unique File Key using Master Key
        const fileKey = await deriveFileKey(encryptionKey, fileSalt);

        // 3. Encrypt metadata
        // ✅ Backend expects 'filename' to show correct names in Chat Citations
        const { encryptedMetadata, iv: metadataIv } = await encryptMetadata(
          {
            filename: file.name, 
            type: file.type || 'application/octet-stream',
            size: file.size
          },
          fileKey
        )

        // 4. Encrypt file content
        const { encryptedFileBlob, iv: fileIv } = await encryptFile(file, fileKey)

        // 5. Prepare form data
        // ✅ crypto.js now returns IVs as Base64 strings, so NO JSON.stringify needed
        const formData = new FormData()
        formData.append('encrypted_file', encryptedFileBlob, file.name)
        formData.append('encrypted_metadata', encryptedMetadata)
        formData.append('metadata_iv', metadataIv) 
        formData.append('file_iv', fileIv)
        formData.append('file_salt', buff_to_b64(fileSalt)) // ✅ Convert Salt to Base64
        formData.append('folder_id', currentFolderId)

        await api.post('/files/upload', formData)
      }

      onUploadSuccess()
      handleClose()
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Upload failed. Please check your connection or key.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFiles([])
    setError('')
    setIsUploading(false)
    setIsDragging(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md animate-fadeIn'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-xl font-semibold text-gray-800'>Upload Encrypted Files</h2>
          <button onClick={handleClose} className='text-gray-400 hover:text-gray-600 transition-colors'>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 pt-5 pb-6 cursor-pointer transition-all duration-200 ease-in-out ${
              isDragging 
                ? 'border-blue-500 bg-blue-50 scale-105' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
          >
            <svg
              className={`mx-auto h-12 w-12 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
              stroke='currentColor'
              fill='none'
              viewBox='0 0 48 48'
              aria-hidden='true'
            >
              <path
                d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            <p className='text-sm text-gray-600 mt-2 text-center'>
              <span className='font-medium text-blue-600 hover:text-blue-500'>Click to select</span> or drag & drop files
            </p>
            <p className="text-xs text-gray-400 mt-1">Files are encrypted before leaving your device</p>
            <input
              type='file'
              multiple
              onChange={e => handleFileSelect(e.target.files)}
              className='hidden'
              id='file-upload'
            />
            <label
              htmlFor='file-upload'
              className='mt-4 px-4 py-2 text-xs font-medium bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer transition-colors'
            >
              Browse Computer
            </label>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="w-full mt-4 max-h-32 overflow-y-auto">
                <ul className='space-y-2'>
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
                      <span className="mr-2">📄</span> 
                      <span className="truncate">{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-50 text-red-600 text-sm rounded border border-red-100 flex items-center">
              ⚠️ {error}
            </div>
          )}

          <div className='mt-6 flex justify-end space-x-3'>
            <button
              type='button'
              onClick={handleClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isUploading || !files.length}
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md hover:shadow-lg flex items-center'
            >
              {isUploading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isUploading ? 'Encrypting & Uploading...' : 'Upload Securely'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadModal