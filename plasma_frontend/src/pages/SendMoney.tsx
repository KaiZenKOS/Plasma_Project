import { Icon } from "@iconify/react";

export function SendMoney() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      <div className="absolute -top-24 left-12 size-72 bg-primary/10 rounded-full blur-3xl opacity-60" />
      <div className="absolute -bottom-32 -right-24 size-80 bg-primary/10 rounded-full blur-3xl opacity-60" />
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <button className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center border border-border">
          <Icon
            icon="solar:alt-arrow-right-linear"
            className="size-5 rotate-180"
          />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold font-heading">Send Money</h1>
          <p className="text-xs text-muted-foreground">
            Secure payment with optional escrow
          </p>
        </div>
        <button className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center border border-border">
          <Icon icon="solar:users-group-rounded-bold" className="size-5" />
        </button>
      </header>

      <main className="flex-1 px-6 pb-24 flex flex-col gap-6">
        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Icon icon="solar:user-bold" className="size-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recipient</p>
                <p className="font-semibold">Choose who gets paid</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-primary">
              Select
            </button>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border px-4 py-3">
            <Icon
              icon="solar:search-bold"
              className="size-4 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Name, username, or wallet"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
        </section>

        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold">How much to send</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Icon icon="solar:wallet-money-bold" className="size-4" />
              USDT
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border px-4 py-3">
            <span className="text-primary text-lg font-bold">$</span>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-transparent outline-none text-2xl font-bold placeholder:text-muted-foreground"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button className="rounded-full bg-secondary border border-border py-2 font-semibold text-muted-foreground">
              50
            </button>
            <button className="rounded-full bg-secondary border border-border py-2 font-semibold text-muted-foreground">
              150
            </button>
            <button className="rounded-full bg-secondary border border-border py-2 font-semibold text-muted-foreground">
              Max
            </button>
          </div>
        </section>

        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="font-semibold">What is this payment for?</p>
          </div>
          <textarea
            rows={3}
            placeholder="Add a note for the recipient"
            className="w-full rounded-2xl bg-secondary/60 border border-border px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
          />
        </section>

        <section className="bg-card border border-border/60 rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Escrow protection</p>
              <p className="font-semibold">Hold funds until delivery</p>
              <p className="text-xs text-muted-foreground mt-1">
                Protect both sides by releasing funds only when approved.
              </p>
            </div>
            <button className="w-12 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center">
              <span className="size-6 rounded-full bg-primary block translate-x-5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Escrow fee</span>
            <span className="font-semibold text-foreground">1.5%</span>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-background/90 backdrop-blur border-t border-border">
        <button className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          Review &amp; Send
          <Icon icon="solar:arrow-right-linear" className="size-6" />
        </button>
      </footer>
    </div>
  );
}
