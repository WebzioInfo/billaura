import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, AlertTriangle, SwitchCamera, Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/ui';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Stop active stream tracks safely
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track', e);
        }
      });
      setStream(null);
    }
  }, [stream]);

  // Start media stream for selected or preferred device
  const startCamera = useCallback(async (deviceId?: string) => {
    stopStream();
    setError(null);
    setIsInitializing(true);
    setCapturedDataUrl(null);
    setCapturedBlob(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access is not supported by your browser or environment. Please upload a bill file instead.');
      setIsInitializing(false);
      return;
    }

    try {
      // 1. Enumerate available video input devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);

      // 2. Constraints: prefer environment (rear) camera on mobile, or selected device
      let videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };

      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId };
      } else {
        videoConstraints.facingMode = { ideal: 'environment' };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Play interrupted', e));
      }

      // Track active device ID
      const activeTrack = mediaStream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera permissions in your browser address bar, or use the file upload option.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device was detected on your system. Please connect a webcam or upload a bill image.');
      } else {
        setError(`Unable to open camera: ${err.message || 'Unknown device error'}. You can upload a photo from your device.`);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [stopStream]);

  // Trigger camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
      setCapturedDataUrl(null);
      setCapturedBlob(null);
      setError(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Switch to another camera device
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startCamera(newId);
  };

  // Capture frame to canvas
  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    // High quality JPEG for OCR readability
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          setCapturedDataUrl(dataUrl);
          // Pause / freeze stream display
          stopStream();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo: restart camera stream
  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCapturedBlob(null);
    startCamera(selectedDeviceId);
  };

  // Confirm and pass captured File to parent upload workflow
  const handleUsePhoto = () => {
    if (!capturedBlob) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = new File([capturedBlob], `vendor-bill-scan-${timestamp}.jpg`, {
      type: 'image/jpeg',
    });
    stopStream();
    onCapture(file);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Scan Vendor Bill</h3>
              <p className="text-xs text-muted-foreground">
                Capture high-resolution invoice document for AI OCR & data extraction
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] sm:min-h-[440px] overflow-hidden">
          {/* Error State */}
          {error && (
            <div className="p-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Camera Access Error</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">{error}</p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    stopStream();
                    onClose();
                  }}
                  className="text-xs"
                >
                  Upload File Instead
                </Button>
              </div>
            </div>
          )}

          {/* Active Live Video Feed */}
          {!error && !capturedDataUrl && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-contain max-h-[550px]"
              />

              {/* Document Alignment Frame Overlay */}
              <div className="absolute inset-8 sm:inset-12 pointer-events-none border-2 border-dashed border-primary/60 rounded-xl flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between text-[11px] font-bold text-white/90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm self-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Align the bill flat inside the frame
                </div>
                <div className="text-[10px] text-white/70 text-center bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm self-center">
                  Ensure invoice text & numbers are clearly lit and readable
                </div>
              </div>
            </div>
          )}

          {/* Captured Frozen Preview */}
          {capturedDataUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedDataUrl}
                alt="Captured Bill Scan"
                className="w-full h-full object-contain max-h-[550px]"
              />
              <div className="absolute top-4 left-4 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Snapshot Captured
              </div>
            </div>
          )}

          {/* Hidden Canvas for High-Resolution Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-surface border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Camera Device Switcher (if multiple cameras available) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {devices.length > 1 && !capturedDataUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground w-full sm:w-auto">
                <SwitchCamera className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                >
                  {devices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            {!capturedDataUrl ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    stopStream();
                    onClose();
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCapturePhoto}
                  disabled={isInitializing || !!error}
                  className="text-xs font-bold px-6 shadow-md"
                >
                  <Camera className="w-4 h-4 mr-1.5" />
                  Capture Bill
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retake Photo
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUsePhoto}
                  className="text-xs font-bold px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Use This Photo
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
