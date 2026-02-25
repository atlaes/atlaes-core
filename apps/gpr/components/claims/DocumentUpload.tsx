'use client';

import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
  /** Accepted file types */
  accept?: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Label for the upload area */
  label?: string;
  /** Helper text below the label */
  helperText?: string;
  /** Currently uploaded file (for display) */
  currentFile?: {
    name: string;
    url?: string;
  } | null;
  /** Upload handler - receives the File object */
  onUpload: (file: File) => Promise<void>;
  /** Remove handler */
  onRemove?: () => void;
  /** Loading state */
  isUploading?: boolean;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const DEFAULT_MAX_SIZE_MB = 10;

export default function DocumentUpload({
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  label = 'Upload document',
  helperText,
  currentFile,
  onUpload,
  onRemove,
  isUploading = false,
  error,
  disabled = false,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const displayError = error || localError;

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const fileMime = file.type.toLowerCase();

    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExt === type;
      }
      if (type.includes('*')) {
        const [main] = type.split('/');
        return fileMime.startsWith(main);
      }
      return fileMime === type;
    });

    if (!isValidType) {
      return `Invalid file type. Accepted: ${accept}`;
    }

    return null;
  }, [accept, maxSizeMB]);

  const handleFile = useCallback(async (file: File) => {
    setLocalError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    try {
      await onUpload(file);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [validateFile, onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, isUploading, handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalError(null);
    onRemove?.();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  // Display uploaded file
  if (currentFile && !isUploading) {
    return (
      <div className="claims-upload-preview">
        <div className="claims-upload-preview-file">
          {getFileIcon(currentFile.name)}
          <div className="claims-upload-preview-info">
            <span className="claims-upload-preview-name">{currentFile.name}</span>
            <span className="claims-upload-preview-status">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Uploaded
            </span>
          </div>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="claims-upload-remove"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="claims-upload-wrapper">
      <div
        className={`claims-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${displayError ? 'error' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="claims-upload-input"
          disabled={disabled || isUploading}
          aria-hidden="true"
        />

        {isUploading ? (
          <div className="claims-upload-loading">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span>Uploading...</span>
          </div>
        ) : (
          <>
            <Upload className="claims-upload-icon" />
            <span className="claims-upload-label">{label}</span>
            <span className="claims-upload-hint">
              Drag and drop or click to browse
            </span>
            {helperText && (
              <span className="claims-upload-helper">{helperText}</span>
            )}
            <span className="claims-upload-formats">
              Accepted: {accept.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')}
            </span>
          </>
        )}
      </div>

      {displayError && (
        <div className="claims-upload-error">
          <AlertCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
