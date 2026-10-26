import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, X, AlertCircle, RefreshCw, Zap } from "lucide-react";

export default function CameraScanner({ onScan, onClose, title = "Scan Barcode or Return QR" }) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    const elementId = "bharatloop-camera-reader";
    let isMounted = true;

    async function startScanner() {
      try {
        setIsStarting(true);
        setErrorMessage("");

        // Supported formats: EAN-13, UPC-A, QR_CODE, CODE_128, etc.
        const formats = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
        ];

        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: formats,
          verbose: false,
        });
        scannerRef.current = scanner;

        const config = {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.75);
            return { width: size, height: Math.floor(size * 0.8) };
          },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            try {
              if (navigator.vibrate) navigator.vibrate(80);
            } catch (_) {}
            
            // Clean stop before callback
            if (scanner.isScanning) {
              scanner.stop().then(() => {
                onScan(decodedText);
              }).catch(() => {
                onScan(decodedText);
              });
            } else {
              onScan(decodedText);
            }
          },
          () => {
            // Frame scan failed (normal while searching)
          }
        );

        if (isMounted) setIsStarting(false);
      } catch (err) {
        if (!isMounted) return;
        setIsStarting(false);
        const errStr = String(err);
        if (errStr.includes("NotAllowedError") || errStr.includes("Permission")) {
          setErrorMessage("Camera access was denied. Please allow camera permissions in your browser or use manual code entry.");
        } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError")) {
          setErrorMessage("No camera was detected on this device. Please use manual code entry.");
        } else {
          setErrorMessage(`Unable to initialize camera: ${err.message || errStr}. You can type the code manually below.`);
        }
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          try {
            scannerRef.current.clear();
          } catch (_) {}
        });
      }
    };
  }, [onScan]);

  const handleClose = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        onClose();
      });
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-950 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400">Point at product barcode or return QR</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-black border border-slate-800 aspect-square flex items-center justify-center">
          <div id="bharatloop-camera-reader" className="w-full h-full" />

          {/* Scanner Overlay Guide */}
          {!errorMessage && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative w-64 h-48 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                {/* Laser animation */}
                <div className="absolute left-2 right-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] animate-[scan_2s_ease-in-out_infinite]" />
                
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-300 rounded-tl" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-300 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-300 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-300 rounded-br" />
              </div>
              <p className="mt-4 text-xs font-medium text-emerald-300/80 bg-slate-900/80 px-3 py-1 rounded-full border border-emerald-500/20">
                Align barcode or QR within frame
              </p>
            </div>
          )}

          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6">
              <RefreshCw className="animate-spin text-emerald-400 mb-3" size={28} />
              <p className="text-sm font-medium text-slate-200">Starting optical scanner...</p>
              <p className="text-xs text-slate-400 mt-1">Requesting high-resolution camera stream</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
              <AlertCircle size={32} className="text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-slate-200">{errorMessage}</p>
              <button
                onClick={handleClose}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
              >
                Switch to Manual Code Entry
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            EAN-13, UPC-A &amp; QR Compatible
          </span>
          <button
            onClick={handleClose}
            className="text-emerald-400 hover:underline font-medium"
          >
            Enter code manually
          </button>
        </div>
      </div>
    </div>
  );
}
