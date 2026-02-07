import { useState } from "react";
import { usePrivateKeyWallet } from "../context/PrivateKeyWalletContext";
import { Eye, EyeOff, Key, X } from "lucide-react";

type PrivateKeyLoginProps = {
  onClose?: () => void;
  onSuccess?: () => void;
};

export function PrivateKeyLogin({ onClose, onSuccess }: PrivateKeyLoginProps) {
  const [privateKey, setPrivateKey] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { connectWithPrivateKey, isConnected, address } = usePrivateKeyWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);

    try {
      const success = connectWithPrivateKey(privateKey.trim());
      if (success) {
        setPrivateKey(""); // Clear input for security
        onSuccess?.();
      } else {
        setError("Clé privée invalide. Veuillez vérifier votre clé.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la connexion avec la clé privée"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected && address) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Connecté avec clé privée
              </p>
              <p className="text-xs text-green-700">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-green-600 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-[#295c4f]" />
          <h3 className="text-lg font-semibold text-gray-900">
            Connexion avec clé privée
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="private-key"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Clé privée
          </label>
          <div className="relative">
            <input
              id="private-key"
              type={showPrivateKey ? "text" : "password"}
              value={privateKey}
              onChange={(e) => {
                setPrivateKey(e.target.value);
                setError(null);
              }}
              placeholder="0x..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 font-mono text-sm focus:border-[#295c4f] focus:outline-none focus:ring-2 focus:ring-[#295c4f]/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPrivateKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Votre clé privée n'est jamais stockée et reste uniquement en mémoire
            pendant la session.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isConnecting || !privateKey.trim()}
            className="flex-1 rounded-lg bg-[#295c4f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1f4a3e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting ? "Connexion..." : "Se connecter"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="mt-4 rounded-lg bg-yellow-50 p-3">
        <p className="text-xs text-yellow-800">
          <strong>⚠️ Avertissement de sécurité :</strong> Ne partagez jamais votre
          clé privée. Elle donne un accès complet à votre wallet.
        </p>
      </div>
    </div>
  );
}

