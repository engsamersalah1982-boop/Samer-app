import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  X,
  Camera,
  AlertCircle,
  FlipHorizontal,
  Upload,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { db } from '../../services/db';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const { isArabic, t } = useLanguage();
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const equipmentList = db.getEquipment();

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Trigger scan success with feedback & vibration
  const handleSuccess = (scannedText: string) => {
    const cleaned = scannedText.trim();
    if (!cleaned) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch {
        // ignore
      }
    }
    setScanFeedback(cleaned);
    stopCamera();
    setTimeout(() => {
      onScanSuccess(cleaned);
      onClose();
    }, 350);
  };

  // Start camera with automatic fallbacks
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        isArabic
          ? 'المتصفح لا يدعم الوصول المباشر لكاميرا الويب، يرجى إدخال الرمز أو التقاط صورة'
          : 'Camera API not supported in this browser. Please enter code or upload photo.'
      );
      return;
    }

    try {
      // First attempt: preferred rear or front camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback: any video input
        console.warn('Initial camera constraint failed, falling back to default video input', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraActive(true);

        // Initiate BarcodeDetector loop if supported by browser
        initiateBarcodeDetection();
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setCameraError(
        isPermissionDenied
          ? isArabic
            ? 'تم حظر الإذن بالكاميرا من إعدادات المتصفح أو الهاتف. يرجى تفعيل الكاميرا للموقع أو التقاط صورة للملصق.'
            : 'Camera permission was denied. Please allow camera access or snap a photo of the QR tag.'
          : isArabic
          ? 'تعذر تشغيل الكاميرا حالياً. يمكنك إدخال الرمز يدوياً أو اختيار المعدة فورياً.'
          : 'Could not activate camera. You can enter the code manually or pick equipment below.'
      );
      setCameraActive(false);
    }
  };

  // Real-time Barcode / QR detection loop
  const initiateBarcodeDetection = () => {
    // Check if BarcodeDetector API exists natively
    if ('BarcodeDetector' in window) {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const detector = new BarcodeDetectorClass({
          formats: ['qr_code', 'code_128', 'code_39', 'data_matrix'],
        });

        const scanFrame = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              if (detected) {
                handleSuccess(detected);
                return;
              }
            }
          } catch {
            // ignore frame error and keep looping
          }

          animationFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (e) {
        console.warn('BarcodeDetector initialization error:', e);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
      setScanFeedback(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Flip between environment (back) and user (front)
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Handle image / photo upload to detect QR code
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      if ('BarcodeDetector' in window) {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const detector = new BarcodeDetectorClass({
          formats: ['qr_code', 'code_128', 'code_39', 'data_matrix'],
        });
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const barcodes = await detector.detect(img);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          handleSuccess(barcodes[0].rawValue);
          return;
        }
      }

      // If native detector wasn't available or didn't find anything, check file name or prompt manual
      const filenameMatch = file.name.match(/JBC-[A-Z0-9-]+/i);
      if (filenameMatch) {
        handleSuccess(filenameMatch[0]);
        return;
      }

      setCameraError(
        isArabic
          ? 'تم استلام الصورة ولكن تعذر قراءة الباركود بدقة. يرجى إدخال الرمز المكتوب على الملصق أدناه.'
          : 'Could not detect QR pattern clearly from this image. Please enter tag code below.'
      );
    } catch (err) {
      console.warn('File decode error:', err);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccess(manualCode.trim());
    }
  };

  const handleQuickSelect = (code: string) => {
    handleSuccess(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('navScanQR')}</h3>
              <p className="text-[11px] text-slate-400">
                {isArabic
                  ? 'ماسح QR الميداني لأصول ومعدات شركة الغاز الحيوي الأردنية'
                  : 'Field QR scanner for Jordan Biogas assets & orders'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Success Notice */}
        {scanFeedback && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-2xl flex items-center gap-3 text-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">{isArabic ? 'تم التقاط الرمز بنجاح!' : 'QR Code Scanned!'}</p>
              <p className="text-[11px] font-mono font-bold text-white">{scanFeedback}</p>
            </div>
          </div>
        )}

        {/* Camera Viewfinder Box */}
        <div className="relative w-full h-56 bg-black rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
          {/* Always mount video element so reference is never null */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0 absolute'
            }`}
          />

          {!cameraActive && (
            <div className="text-center p-4 z-10">
              <Camera className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto">
                {cameraError ||
                  (isArabic
                    ? 'جاري فتح الكاميرا الميدانية...'
                    : 'Opening field camera...')}
              </p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold shadow transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isArabic ? 'إعادة محاولة تشغيل الكاميرا' : 'Retry Camera'}
              </button>
            </div>
          )}

          {/* Holographic Reticle Frame */}
          {cameraActive && (
            <div className="absolute inset-6 border-2 border-emerald-400/60 rounded-xl pointer-events-none flex flex-col justify-between p-1">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-s-2 border-emerald-400" />
                <span className="w-4 h-4 border-t-2 border-e-2 border-emerald-400" />
              </div>
              {/* Animated Laser Scanning Line */}
              <div className="w-full h-0.5 bg-emerald-400 shadow-md shadow-emerald-400 animate-pulse" />
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-s-2 border-emerald-400" />
                <span className="w-4 h-4 border-b-2 border-e-2 border-emerald-400" />
              </div>
            </div>
          )}

          {/* Camera Controls Overlay */}
          <div className="absolute top-2.5 end-2.5 flex items-center gap-2 z-20">
            {cameraActive && (
              <button
                type="button"
                onClick={toggleCameraFacing}
                title={isArabic ? 'تبديل الكاميرا (أمامية / خلفية)' : 'Switch Camera'}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-xs transition"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={isArabic ? 'رفع أو التقاط صورة لرمز QR' : 'Upload QR Image'}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-emerald-400 border border-slate-700 backdrop-blur-xs transition"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Manual Barcode input */}
        <form onSubmit={handleManualSubmit} className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 block">
            {isArabic
              ? 'أو إدخال كود المعدة يدوياً (مثال: JBC-GEN-01):'
              : 'Or enter asset barcode tag manually:'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. JBC-GEN-01"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono font-bold"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
            >
              {isArabic ? 'فتح الأصل' : 'Inspect'}
            </button>
          </div>
        </form>

        {/* Fast 1-Tap Equipment Selector for Field Testing */}
        <div className="pt-2 border-t border-slate-800">
          <span className="text-[10px] text-slate-400 block uppercase font-bold mb-2">
            {isArabic ? 'اختيار فوري ومباشر لمعدات المحطة:' : 'Direct Quick Access To Plant Assets:'}
          </span>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
            {equipmentList.map((eq) => (
              <button
                key={eq.id}
                type="button"
                onClick={() => handleQuickSelect(eq.code)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-start text-xs border border-slate-700/80 transition flex items-center justify-between group"
              >
                <span className="font-mono font-bold text-emerald-400 text-[11px] truncate">
                  {eq.code}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[85px]">
                  {isArabic ? eq.nameAr : eq.nameEn}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
