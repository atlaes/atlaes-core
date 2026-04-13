'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowRight, Pencil, Upload, Undo2, Redo2, Trash2, Loader2 } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import {
  uploadSignature as uploadSignatureApi,
  attachSignatureToClaim,
} from '@/lib/onboarding-api';

interface SignatureProps {
  onNext: () => void;
}

type SignatureMode = 'draw' | 'upload';

export const Signature: React.FC<SignatureProps> = ({ onNext }) => {
  const { data, updateData, updateSignature } = useOnboarding();
  const [mode, setMode] = useState<SignatureMode>(
    data.signature.signatureType === 'upload' ? 'upload' : 'draw'
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = '#163300';
    context.lineWidth = 2;
    contextRef.current = context;

    // Restore saved signature if exists
    if (data.signature.signatureData && data.signature.signatureType === 'draw') {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      };
      img.src = data.signature.signatureData;
    }
  }, [data.signature.signatureData, data.signature.signatureType]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const context = contextRef.current;
    if (!context) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    context.beginPath();
    context.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;

      const context = contextRef.current;
      if (!context) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        e.preventDefault(); // Prevent scrolling while drawing
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      context.lineTo(clientX - rect.left, clientY - rect.top);
      context.stroke();
    },
    [isDrawing]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      const context = contextRef.current;
      if (context) {
        context.closePath();
      }
      setIsDrawing(false);
      saveToHistory();

      // Save to context. Client #15: clearing signatureId here ensures the
      // modified drawing is re-uploaded on the next Continue, instead of
      // attaching the stale (possibly invalidated) server-side ID.
      const canvas = canvasRef.current;
      if (canvas) {
        updateSignature({
          signatureData: canvas.toDataURL(),
          signatureType: 'draw',
        });
        updateData({ signatureId: undefined });
      }
    }
  }, [isDrawing, saveToHistory, updateSignature, updateData]);

  // Client #15: every mutation to the drawn signature must invalidate the
  // cached server-side signatureId. Otherwise, if the user uploaded once,
  // then undid/redid/cleared, a second Continue would attach the stale
  // (already consumed) ID to the claim and trigger an "Invalid Token" error.
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) {
      // Clear canvas
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        updateSignature({ signatureData: undefined });
        updateData({ signatureId: undefined });
      }
      setHistoryIndex(-1);
      return;
    }

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      updateSignature({ signatureData: history[historyIndex - 1] });
      updateData({ signatureId: undefined });
    };
    img.src = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
  }, [history, historyIndex, updateSignature, updateData]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      updateSignature({ signatureData: history[historyIndex + 1] });
      updateData({ signatureId: undefined });
    };
    img.src = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
  }, [history, historyIndex, updateSignature, updateData]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setHistoryIndex(-1);
    updateSignature({ signatureData: undefined, signatureType: 'draw' });
    updateData({ signatureId: undefined });
  }, [updateSignature, updateData]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        updateSignature({
          signatureFile: file,
          signatureData: dataUrl,
          signaturePreview: dataUrl,
          signatureType: 'upload',
        });
        // Client #15: new upload invalidates any previously issued signatureId.
        updateData({ signatureId: undefined });
      };
      reader.readAsDataURL(file);
    },
    [updateSignature, updateData]
  );

  const handleContinue = useCallback(async () => {
    const sigData = data.signature.signatureData;
    if (!sigData) return;

    setIsUploading(true);
    setUploadError(null);

    // If signature was already uploaded (e.g., retry after attach failure), reuse the ID
    let signatureId = data.signatureId;

    try {
      if (!signatureId) {
        const result = await uploadSignatureApi(sigData);
        signatureId = result.signature.id;
        updateData({ signatureId });
      }

      if (data.claimId) {
        await attachSignatureToClaim(data.claimId, signatureId);
      }
      onNext();
    } catch (err: any) {
      console.error('Signature upload error:', err);
      const detail = err?.response?.data?.error || err?.message || '';
      setUploadError(
        `Failed to save signature${detail ? `: ${detail}` : ''}. Please try again.`
      );
    } finally {
      setIsUploading(false);
    }
  }, [data.claimId, data.signatureId, data.signature.signatureData, updateData, onNext]);

  const canProceed =
    data.signature.signatureData !== undefined || data.signature.signatureFile !== null;

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Add your signature
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Your signature will be used to sign your refund claim and authorize representation.
      </p>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('draw')}
          className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
            mode === 'draw'
              ? 'bg-[#9FE870] text-[#163300]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Pencil className="w-4 h-4" />
          Draw Signature
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
            mode === 'upload'
              ? 'bg-[#9FE870] text-[#163300]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Image
        </button>
      </div>

      {/* Draw Mode */}
      {mode === 'draw' && (
        <>
          <div
            className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white"
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full cursor-crosshair"
              style={{ height: '200px' }}
            />
            {!data.signature.signatureData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400">Draw your signature</p>
              </div>
            )}
          </div>

          {/* Drawing Controls */}
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={handleUndo}
              disabled={historyIndex < 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-4 h-4" />
              Redo
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          {data.signature.signaturePreview && data.signature.signatureType === 'upload' ? (
            <div className="relative">
              <img
                src={data.signature.signaturePreview}
                alt="Uploaded signature"
                className="max-h-32 mx-auto"
              />
              <button
                onClick={() => {
                  updateSignature({
                    signatureFile: null,
                    signatureData: undefined,
                    signaturePreview: undefined,
                    signatureType: '',
                  });
                  // Client #15: deleting the uploaded signature also clears
                  // the stale server-side ID so it can't be reused.
                  updateData({ signatureId: undefined });
                }}
                className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Upload signature image</p>
              <label className="inline-block px-4 py-2 bg-[#9FE870] text-[#163300] font-medium rounded-lg cursor-pointer hover:bg-[#8AD860] transition-colors">
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!canProceed || isUploading}
        className={`w-full mt-8 py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
          canProceed && !isUploading
            ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};

export default Signature;
