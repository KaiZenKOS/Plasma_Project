import { PrivateKeyLogin } from "./PrivateKeyLogin";

type PrivateKeyLoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PrivateKeyLoginModal({
  isOpen,
  onClose,
}: PrivateKeyLoginModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md">
        <PrivateKeyLogin
          onClose={onClose}
          onSuccess={() => {
            // Close modal after successful connection
            setTimeout(onClose, 500);
          }}
        />
      </div>
    </div>
  );
}

