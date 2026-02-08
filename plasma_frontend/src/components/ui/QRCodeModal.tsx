/**
 * QRCodeModal - Alias/Wrapper for ShareQRCode component
 * This component provides a consistent interface for QR code modals throughout the app.
 * 
 * @deprecated Use ShareQRCode directly instead. This is kept for backward compatibility.
 */
import { ShareQRCode } from "../ShareQRCode";

type QRCodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
};

/**
 * QRCodeModal - A reusable modal component for displaying QR codes.
 * 
 * This is an alias for ShareQRCode component. Use ShareQRCode directly for new code.
 */
export function QRCodeModal({ isOpen, onClose, url, title }: QRCodeModalProps) {
  return <ShareQRCode url={url} title={title} isOpen={isOpen} onClose={onClose} />;
}

