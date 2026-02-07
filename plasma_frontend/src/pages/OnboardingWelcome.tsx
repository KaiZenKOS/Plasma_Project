import { Icon } from "@iconify/react";

export function OnboardingWelcome() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans relative">
      <header className="flex justify-end items-center px-6 pt-12">
        <button className="text-sm font-semibold text-primary px-4 py-2 active:opacity-70 transition-opacity">
          Skip
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <div className="absolute size-32 bg-primary/20 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(5,179,161,0.2)]">
              <Icon icon="solar:shield-check-bold" className="size-16 text-primary" />
            </div>
            <div className="absolute top-8 right-4 size-16 bg-card border border-border rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
              <Icon icon="solar:graph-up-bold" className="size-8 text-primary" />
            </div>
            <div className="absolute bottom-12 left-2 size-14 bg-card border border-border rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
              <Icon icon="solar:share-bold" className="size-7 text-primary" />
            </div>
            <svg
              className="absolute inset-0 w-full h-full opacity-40"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M40 140C60 120 140 140 160 80"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6 6"
                className="text-primary"
              />
              <path
                d="M20 60C50 40 120 60 150 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="text-primary"
              />
              <circle cx="160" cy="80" r="4" className="fill-primary" />
              <circle cx="40" cy="140" r="4" className="fill-primary" />
            </svg>
            <div className="absolute top-1/4 left-1/4 size-3 bg-primary rounded-full animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 size-2 bg-primary/50 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2 mt-12">
          <div className="h-2 w-6 rounded-full bg-primary" />
          <div className="h-2 w-2 rounded-full bg-muted" />
          <div className="h-2 w-2 rounded-full bg-muted" />
          <div className="h-2 w-2 rounded-full bg-muted" />
        </div>
      </div>
      <div className="px-8 pb-12 flex flex-col items-center text-center">
        <h2 className="text-4xl font-bold font-heading tracking-tight mb-4">Pay Securely</h2>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-[280px]">
          Transactions are held in secure escrow until you approve the work. Your peace of mind is
          our priority.
        </p>
      </div>
      <footer className="px-6 pb-12">
        <button className="w-full bg-primary text-primary-foreground py-5 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          Next
          <Icon icon="solar:arrow-right-linear" className="size-6" />
        </button>
      </footer>
      <div className="absolute -bottom-24 -left-24 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
