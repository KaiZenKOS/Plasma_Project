import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

// Import QRCode from react-qr-code
// The package exports QRCode as default export
import QRCodeComponent from "react-qr-code";

type ShareQRCodeProps = {
  url: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
};

export function ShareQRCode({ url, title, isOpen, onClose }: ShareQRCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="size-5 text-gray-500" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-[#111827] mb-6 text-center" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
          {title}
        </h2>

        {/* QR Code */}
        <div className="flex justify-center mb-6 p-4 bg-white rounded-xl border-2 border-[#e5e7eb]">
          <QRCodeComponent
            value={url}
            size={256}
            level="H"
            fgColor="#111827"
            bgColor="#FFFFFF"
            className="w-full h-auto max-w-[256px]"
          />
        </div>

        {/* URL Display */}
        <div className="mb-6">
          <p className="text-xs text-[#6b7280] mb-2 text-center">Share this link:</p>
          <div className="flex items-center gap-2 p-3 bg-[#f9fafb] rounded-lg border border-[#e5e7eb]">
            <p className="flex-1 text-sm text-[#111827] font-mono truncate">{url}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10b981] text-white text-sm font-semibold hover:bg-[#059669] transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-xs text-[#6b7280] text-center">
          Scan the QR code with your phone camera to open the link
        </p>
      </div>
    </div>
  );
}

