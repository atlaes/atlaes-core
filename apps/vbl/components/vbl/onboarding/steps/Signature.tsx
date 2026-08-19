'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  ArrowRight,
  Pencil,
  Upload,
  Undo2,
  Redo2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingVariant } from '@/components/vbl/onboarding/onboarding-variant';
import {
  uploadSignature as uploadSignatureApi,
  attachSignatureToClaim,
} from '@/lib/onboarding-api';

interface SignatureProps {
  onNext: () => void | Promise<void>;
  variant?: OnboardingVariant;
}

type SignatureMode = 'draw' | 'upload';

export const Signature: React.FC<SignatureProps> = ({
  onNext,
  variant = 'default',
}) => {
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
  const latestCanvasDataRef = useRef<string | undefined>(
    data.signature.signatureType === 'draw'
      ? data.signature.signatureData
      : undefined
  );
  const fileReaderRef = useRef<FileReader | null>(null);
  const fileReadGenerationRef = useRef(0);
  const isMountedRef = useRef(true);
  const isMutationLockedRef = useRef(false);
  const canvasMutationGenerationRef = useRef(0);
  const pendingResizeRef = useRef(false);
  const resizeCanvasRef = useRef<(() => void) | null>(null);
  const modeRef = useRef<SignatureMode>(mode);
  modeRef.current = mode;

  const invalidateCanvasMutations = useCallback(() => {
    canvasMutationGenerationRef.current += 1;
    return canvasMutationGenerationRef.current;
  }, []);

  const canApplyCanvasMutation = useCallback(
    (
      generation: number,
      expectedMode: SignatureMode,
      context: CanvasRenderingContext2D
    ) =>
      isMountedRef.current &&
      !isMutationLockedRef.current &&
      canvasMutationGenerationRef.current === generation &&
      modeRef.current === expectedMode &&
      contextRef.current === context,
    []
  );

  const invalidateFileReader = useCallback(() => {
    fileReadGenerationRef.current += 1;
    const reader = fileReaderRef.current;
    fileReaderRef.current = null;
    if (reader?.readyState === FileReader.LOADING) {
      reader.abort();
    }
  }, []);

  useEffect(
    () => () => {
      invalidateFileReader();
    },
    [invalidateFileReader]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      pendingResizeRef.current = false;
      resizeCanvasRef.current = null;
      invalidateCanvasMutations();
    };
  }, [invalidateCanvasMutations]);

  // Draw mode mounts its canvas conditionally, so initialization must follow
  // the mode as well as saved data. Resize only the backing store: Tailwind's
  // `w-full` remains the CSS width at every viewport size.
  useEffect(() => {
    if (mode !== 'draw') {
      contextRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (
      data.signature.signatureType === 'draw' &&
      data.signature.signatureData
    ) {
      latestCanvasDataRef.current = data.signature.signatureData;
    }

    let disposed = false;
    const resizeCanvas = () => {
      if (isMutationLockedRef.current) {
        pendingResizeRef.current = true;
        return;
      }

      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      if (!cssWidth || !cssHeight) return;

      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(cssWidth * dpr);
      const height = Math.round(cssHeight * dpr);
      if (canvas.width === width && canvas.height === height) {
        const context = canvas.getContext('2d');
        if (!context) return;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.lineCap = 'round';
        context.strokeStyle = '#163300';
        context.lineWidth = 2;
        contextRef.current = context;
        return;
      }

      const previousData =
        latestCanvasDataRef.current ||
        (canvas.width && canvas.height ? canvas.toDataURL() : undefined);
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.lineCap = 'round';
      context.strokeStyle = '#163300';
      context.lineWidth = 2;
      contextRef.current = context;

      if (!previousData) return;
      const img = new Image();
      // Every restoration gets a new token. A later resize, Undo, or Redo
      // invalidates this image before its async onload can redraw stale pixels.
      const generation = invalidateCanvasMutations();
      const expectedMode = modeRef.current;
      img.onload = () => {
        if (
          disposed ||
          !canApplyCanvasMutation(generation, expectedMode, context)
        )
          return;
        context.drawImage(img, 0, 0, cssWidth, cssHeight);
      };
      img.src = previousData;
    };

    resizeCanvasRef.current = resizeCanvas;
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas.parentElement || canvas);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      if (resizeCanvasRef.current === resizeCanvas) {
        resizeCanvasRef.current = null;
      }
      if (contextRef.current) contextRef.current = null;
    };
  }, [
    mode,
    data.signature.signatureData,
    data.signature.signatureType,
    canApplyCanvasMutation,
    invalidateCanvasMutations,
  ]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isUploading || isMutationLockedRef.current) return;

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
    },
    [isUploading]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isUploading || isMutationLockedRef.current || !isDrawing) return;

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
    [isDrawing, isUploading]
  );

  const stopDrawing = useCallback(() => {
    if (!isUploading && !isMutationLockedRef.current && isDrawing) {
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
        const signatureData = canvas.toDataURL();
        latestCanvasDataRef.current = signatureData;
        updateSignature({
          signatureData,
          signatureType: 'draw',
        });
        updateData({ signatureId: undefined });
      }
    }
  }, [isDrawing, isUploading, saveToHistory, updateSignature, updateData]);

  // Client #15: every mutation to the drawn signature must invalidate the
  // cached server-side signatureId. Otherwise, if the user uploaded once,
  // then undid/redid/cleared, a second Continue would attach the stale
  // (already consumed) ID to the claim and trigger an "Invalid Token" error.
  //
  // Item 21 follow-up: this clearing was necessary but not sufficient — the
  // "Invalid token" error client #15 was trying to prevent kept recurring on
  // delete + re-enter because of a separate, unrelated bug in the axios
  // token-refresh interceptor (apps/vbl/lib/api.ts) that could corrupt the
  // stored access token the first time it silently refreshed (which tends to
  // happen around this last onboarding step, since the 15-minute access
  // token has often expired by the time the user reaches Signature). Once
  // corrupted, every request — including the retry after delete + re-enter —
  // failed JWT verification with the same generic "Invalid token" message,
  // regardless of whether signatureId was stale or fresh. See lib/api.ts for
  // the fix.
  const handleUndo = useCallback(() => {
    if (isUploading || isMutationLockedRef.current) return;

    if (historyIndex <= 0) {
      // Clear canvas
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        latestCanvasDataRef.current = undefined;
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
    const generation = invalidateCanvasMutations();
    const expectedMode = modeRef.current;
    img.onload = () => {
      if (!canApplyCanvasMutation(generation, expectedMode, context)) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      const signatureData = history[historyIndex - 1];
      latestCanvasDataRef.current = signatureData;
      updateSignature({ signatureData });
      updateData({ signatureId: undefined });
    };
    img.src = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
  }, [
    canApplyCanvasMutation,
    history,
    historyIndex,
    invalidateCanvasMutations,
    isUploading,
    updateSignature,
    updateData,
  ]);

  const handleRedo = useCallback(() => {
    if (isUploading || isMutationLockedRef.current) return;

    if (historyIndex >= history.length - 1) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const img = new Image();
    const generation = invalidateCanvasMutations();
    const expectedMode = modeRef.current;
    img.onload = () => {
      if (!canApplyCanvasMutation(generation, expectedMode, context)) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
      const signatureData = history[historyIndex + 1];
      latestCanvasDataRef.current = signatureData;
      updateSignature({ signatureData });
      updateData({ signatureId: undefined });
    };
    img.src = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
  }, [
    canApplyCanvasMutation,
    history,
    historyIndex,
    invalidateCanvasMutations,
    isUploading,
    updateSignature,
    updateData,
  ]);

  const handleClear = useCallback(() => {
    if (isUploading || isMutationLockedRef.current) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    invalidateCanvasMutations();
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setHistoryIndex(-1);
    latestCanvasDataRef.current = undefined;
    updateSignature({ signatureData: undefined, signatureType: 'draw' });
    updateData({ signatureId: undefined });
  }, [invalidateCanvasMutations, isUploading, updateSignature, updateData]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isUploading || isMutationLockedRef.current) return;

      const file = e.target.files?.[0];
      if (!file) return;

      invalidateFileReader();

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      const generation = fileReadGenerationRef.current;
      fileReaderRef.current = reader;
      reader.onload = (event) => {
        if (
          generation !== fileReadGenerationRef.current ||
          isMutationLockedRef.current ||
          !isMountedRef.current
        )
          return;
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;
        fileReaderRef.current = null;
        updateSignature({
          signatureFile: file,
          signatureData: dataUrl,
          signaturePreview: dataUrl,
          signatureType: 'upload',
        });
        // Client #15: new upload invalidates any previously issued signatureId.
        updateData({ signatureId: undefined });
      };
      reader.onerror = () => {
        if (
          generation !== fileReadGenerationRef.current ||
          isMutationLockedRef.current ||
          !isMountedRef.current
        )
          return;
        fileReaderRef.current = null;
        setUploadError('Failed to read signature image. Please try again.');
      };
      reader.readAsDataURL(file);
    },
    [invalidateFileReader, isUploading, updateSignature, updateData]
  );

  const handleModeChange = useCallback(
    (nextMode: SignatureMode) => {
      if (isUploading || isMutationLockedRef.current) return;
      if (nextMode === mode) return;

      // A signature belongs to its active input method. Clearing it here
      // avoids hidden Draw/Upload state enabling Continue or reusing a
      // server-side ID after the user selects a different method.
      setIsDrawing(false);
      setHistory([]);
      setHistoryIndex(-1);
      latestCanvasDataRef.current = undefined;
      contextRef.current = null;
      invalidateFileReader();
      invalidateCanvasMutations();
      pendingResizeRef.current = false;
      updateSignature({
        signatureFile: null,
        signatureData: undefined,
        signaturePreview: undefined,
        signatureType: '',
      });
      updateData({ signatureId: undefined });
      modeRef.current = nextMode;
      setMode(nextMode);
    },
    [
      invalidateCanvasMutations,
      invalidateFileReader,
      isUploading,
      mode,
      updateData,
      updateSignature,
    ]
  );

  const handleRemoveUploadedSignature = useCallback(() => {
    if (isUploading || isMutationLockedRef.current) return;

    invalidateFileReader();
    updateSignature({
      signatureFile: null,
      signatureData: undefined,
      signaturePreview: undefined,
      signatureType: '',
    });
    // Client #15: deleting the uploaded signature also clears the stale
    // server-side ID so it can't be reused.
    updateData({ signatureId: undefined });
  }, [invalidateFileReader, isUploading, updateData, updateSignature]);

  const handleLegalConfirmation = useCallback(
    (legalConfirmed: boolean) => {
      if (isUploading || isMutationLockedRef.current) return;
      updateSignature({ legalConfirmed });
    },
    [isUploading, updateSignature]
  );

  const handleContinue = useCallback(async () => {
    if (isUploading || isMutationLockedRef.current) return;

    const sigData =
      mode === 'draw'
        ? data.signature.signatureType === 'draw'
          ? data.signature.signatureData
          : undefined
        : data.signature.signatureType === 'upload'
          ? data.signature.signatureData
          : undefined;
    if (!sigData) return;

    // React state updates are asynchronous. Lock and invalidate callback
    // generations synchronously so an Image.onload already in flight cannot
    // redraw or replace this exact payload while it is attaching/submitting.
    isMutationLockedRef.current = true;
    invalidateCanvasMutations();
    setIsUploading(true);
    setUploadError(null);

    // If signature was already uploaded (e.g., retry after attach failure), reuse the ID
    let signatureId = data.signatureId;
    let completedSuccessfully = false;

    try {
      if (!signatureId) {
        const result = await uploadSignatureApi(sigData);
        signatureId = result.signature.id;
        updateData({ signatureId });
      }

      if (data.claimId) {
        await attachSignatureToClaim(data.claimId, signatureId);
      }
      // saveAndAdvance in GetStartedOnboardingFlow.tsx (this screen's
      // onNext) used to call attachSignatureToClaim a second time for the
      // 'signature' sub-step. That call was dead code in practice (its
      // closure always saw a stale, not-yet-committed data.signatureId and
      // skipped), so it was removed as cleanup, not because it caused the
      // "Invalid token" bug (item 21) — see lib/api.ts for the actual root
      // cause (the token-refresh interceptor read the wrong response
      // property and stored the literal string "undefined" as the access
      // token, so every request after the first silent refresh — including
      // this one on a delete + re-enter retry — failed JWT verification).
      await onNext();
      completedSuccessfully = true;
    } catch (err: any) {
      console.error('Signature upload error:', err);
      const detail = err?.response?.data?.error || err?.message || '';
      setUploadError(
        `Failed to save signature${detail ? `: ${detail}` : ''}. Please try again.`
      );
    } finally {
      isMutationLockedRef.current = false;
      setIsUploading(false);
      if (
        !completedSuccessfully &&
        isMountedRef.current &&
        modeRef.current === 'draw' &&
        pendingResizeRef.current
      ) {
        pendingResizeRef.current = false;
        resizeCanvasRef.current?.();
      }
    }
  }, [
    data.claimId,
    data.signatureId,
    data.signature.signatureData,
    data.signature.signatureType,
    mode,
    isUploading,
    invalidateCanvasMutations,
    updateData,
    onNext,
  ]);

  const hasActiveSignature =
    mode === 'draw'
      ? data.signature.signatureType === 'draw' &&
        !!data.signature.signatureData
      : data.signature.signatureType === 'upload' &&
        (!!data.signature.signatureData || !!data.signature.signatureFile);
  const canProceed = hasActiveSignature && data.signature.legalConfirmed;

  return (
    <div
      className={
        variant === 'calculator' ? 'mx-auto max-w-[760px]' : 'max-w-lg mx-auto'
      }
    >
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Add your signature
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Your signature will be used to sign your refund request and authorize
        CompanyPension to receive correspondence from the pension provider for
        this process.
      </p>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          disabled={isUploading}
          onClick={() => handleModeChange('draw')}
          className={`${
            variant === 'calculator'
              ? 'flex-1 rounded-lg px-4 py-4 text-[18px] font-medium flex items-center justify-center gap-2 transition-colors'
              : 'flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors'
          } ${
            mode === 'draw'
              ? 'bg-[#9FE870] text-[#163300]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Pencil className="w-4 h-4" />
          Draw signature
        </button>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => handleModeChange('upload')}
          className={`${
            variant === 'calculator'
              ? 'flex-1 rounded-lg px-4 py-4 text-[18px] font-medium flex items-center justify-center gap-2 transition-colors'
              : 'flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors'
          } ${
            mode === 'upload'
              ? 'bg-[#9FE870] text-[#163300]'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Upload className="w-4 h-4" />
          Upload signature image
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
              aria-disabled={isUploading}
              className={`w-full cursor-crosshair${
                variant === 'calculator' ? ' h-[300px]' : ''
              }${isUploading ? ' pointer-events-none opacity-50' : ''}`}
              style={variant === 'calculator' ? undefined : { height: '200px' }}
            />
            {!data.signature.signatureData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400">Draw your signature here</p>
              </div>
            )}
          </div>

          {/* Drawing Controls */}
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={handleUndo}
              disabled={isUploading || historyIndex < 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={isUploading || historyIndex >= history.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-4 h-4" />
              Redo
            </button>
            <button
              onClick={handleClear}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {data.signature.signaturePreview &&
          data.signature.signatureType === 'upload' ? (
            <div className="relative">
              <img
                src={data.signature.signaturePreview}
                alt="Uploaded signature"
                className="max-h-32 mx-auto"
              />
              <button
                type="button"
                aria-label="Remove uploaded signature"
                disabled={isUploading}
                onClick={handleRemoveUploadedSignature}
                className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 aria-hidden="true" className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Upload signature image</p>
              <label
                aria-disabled={isUploading}
                className={`inline-block px-4 py-2 bg-[#9FE870] text-[#163300] font-medium rounded-lg cursor-pointer hover:bg-[#8AD860] transition-colors ${
                  isUploading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
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

      <label
        className={`mt-6 flex items-start gap-3 ${
          isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <input
          type="checkbox"
          checked={data.signature.legalConfirmed}
          disabled={isUploading}
          onChange={(e) => handleLegalConfirmation(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
        />
        <span className="text-sm text-gray-700">
          I confirm that this is my legal signature.
        </span>
      </label>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!canProceed || isUploading}
        className={`${
          variant === 'calculator'
            ? 'mt-10 w-full rounded-lg px-6 py-4 text-[18px] font-semibold flex items-center justify-center gap-2 transition-colors'
            : 'w-full mt-8 py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors'
        } ${
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
