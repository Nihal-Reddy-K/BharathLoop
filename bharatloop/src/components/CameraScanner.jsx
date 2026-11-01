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
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#355070]/60 bg-[#273E47] p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#355070]/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#355070] text-[#D8973C] border border-[#355070]/80">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-[#D8C99B]">Point at product barcode or return QR</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full bg-[#355070] p-2 text-[#D8C99B] hover:bg-[#1e3037] hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-black border border-[#355070] aspect-square flex items-center justify-center">
          <div id="bharatloop-camera-reader" className="w-full h-full" />

          {/* Scanner Overlay Guide */}
          {!errorMessage && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative w-64 h-48 border-2 border-[#D8973C]/80 rounded-2xl shadow-[0_0_25px_rgba(216,151,60,0.3)]">
                {/* Laser animation */}
                <div className="absolute left-2 right-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#BD632F] to-transparent shadow-[0_0_10px_#BD632F] animate-[scan_2s_ease-in-out_infinite]" />
                
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#D8973C] rounded-tl" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#D8973C] rounded-tr" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#D8973C] rounded-bl" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#D8973C] rounded-br" />
              </div>
              <p className="mt-4 text-xs font-medium text-[#D8C99B] bg-[#273E47]/90 px-3 py-1 rounded-full border border-[#355070]">
                Align barcode or QR within frame
              </p>
            </div>
          )}

          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#273E47]/95 text-center p-6">
              <RefreshCw className="animate-spin text-[#D8973C] mb-3" size={28} />
              <p className="text-sm font-medium text-slate-100">Starting optical scanner...</p>
              <p className="text-xs text-[#D8C99B] mt-1">Requesting high-resolution camera stream</p>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e3037] p-6 text-center">
              <AlertCircle size={32} className="text-[#D8973C] mb-2" />
              <p className="text-sm font-semibold text-slate-200">{errorMessage}</p>
              <button
                onClick={handleClose}
                className="mt-4 rounded-xl bg-[#BD632F] hover:bg-[#a85527] px-4 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                Switch to Manual Code Entry
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-xs text-[#D8C99B]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#D8973C] animate-ping" />
            EAN-13, UPC-A &amp; QR Compatible
          </span>
          <button
            onClick={handleClose}
            className="text-[#D8973C] hover:text-white hover:underline font-medium cursor-pointer"
          >
            Enter code manually
          </button>
        </div>
      </div>
    </div>
  );
}
