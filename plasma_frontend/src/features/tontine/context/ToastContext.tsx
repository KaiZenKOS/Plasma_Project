import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function TontineToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>("info");

  const toast = useCallback((msg: string, t: ToastType = "info") => {
    setMessage(msg);
    setType(t);
    setTimeout(() => setMessage(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {message && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 px-6 py-3 rounded-xl text-white text-sm font-medium max-w-[90vw]"
          style={{
            backgroundColor:
              type === "success" ? "#295c4f" : type === "error" ? "#ef4444" : "#569f8c",
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useTontineToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { toast: () => {} };
}
