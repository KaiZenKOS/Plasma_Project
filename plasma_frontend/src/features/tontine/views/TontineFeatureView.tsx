import { Plus } from "lucide-react";
import { useState } from "react";
import type { TontineGroup } from "../../../api/types";
import type { ViewKey } from "../../../types/navigation";
import {
  CreateTontineForm,
  TontineDashboard,
  TontineList,
  TontineToastProvider,
} from "../index";

type TontineFeatureViewProps = {
  onNavigate: (view: ViewKey) => void;
};

type Screen = "list" | "create" | "dashboard";

export function TontineFeatureView({ onNavigate }: TontineFeatureViewProps) {
  const [screen, setScreen] = useState<Screen>("list");
  const [selectedGroup, setSelectedGroup] = useState<TontineGroup | null>(null);
  const [listKey, setListKey] = useState(0);

  if (screen === "dashboard" && selectedGroup) {
    return (
      <TontineToastProvider>
        <TontineDashboard
          groupId={selectedGroup.id}
          onBack={() => {
            setScreen("list");
            setSelectedGroup(null);
          }}
        />
      </TontineToastProvider>
    );
  }

  return (
    <TontineToastProvider>
      <div className="flex flex-col min-h-screen bg-[#FFFFFF]" style={{ fontFamily: "Outfit, DM Sans, sans-serif" }}>
        <header className="flex items-center justify-between px-6 py-6 border-b border-[#e5e7eb]">
          <button
            type="button"
            onClick={() => onNavigate("nexus")}
            className="p-2 rounded-xl border border-[#e5e7eb] text-[#4a4a4a]"
          >
            ← Orbit
          </button>
          <h1 className="text-xl font-bold text-[#295c4f]">Tontine</h1>
          <button
            type="button"
            onClick={() => setScreen("create")}
            className="p-2 rounded-xl border border-[#295c4f] text-[#295c4f]"
          >
            <Plus className="size-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">
          {screen === "list" && (
            <div className="space-y-8">
              <TontineList
                key={listKey}
                onSelectTontine={(group) => {
                  setSelectedGroup(group);
                  setScreen("dashboard");
                }}
              />
            </div>
          )}

          {screen === "create" && (
            <div className="max-w-lg mx-auto">
              <CreateTontineForm
                onSuccess={() => {
                  setListKey((k) => k + 1);
                  setScreen("list");
                }}
              />
              <button
                type="button"
                onClick={() => setScreen("list")}
                className="mt-6 w-full py-3 rounded-xl border border-[#e5e7eb] text-[#4a4a4a] font-medium"
              >
                Cancel
              </button>
            </div>
          )}

        </main>
      </div>
    </TontineToastProvider>
  );
}
