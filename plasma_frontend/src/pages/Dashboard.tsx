import { Icon } from "@iconify/react";

export function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans pb-24 relative overflow-hidden">
      <header className="flex items-center justify-between px-6 pt-12 pb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold font-heading tracking-tight">My Nexus</h1>
          <p className="text-sm text-muted-foreground">Welcome back, Gogeto</p>
        </div>
        <div className="relative">
          <div className="size-10 rounded-full bg-secondary overflow-hidden ring-2 ring-border">
            <img
              src="https://lh3.googleusercontent.com/a/ACg8ocKmL-11kjce9Kq22bYsHvbkHNPfmpbR4qVFSFlYJTRu2h54hDQ=s96-c"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute bottom-0 right-0 size-3 bg-primary rounded-full border-2 border-background" />
        </div>
      </header>
      <main className="flex-1 flex flex-col gap-8 px-6 overflow-y-auto">
        <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border/50 p-6 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Icon icon="solar:wallet-bold" className="size-32 text-primary rotate-12 -mr-8 -mt-8" />
          </div>
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Total Balance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-primary text-2xl font-bold">$</span>
              <span className="text-4xl font-bold tracking-tight text-foreground">14,250.00</span>
              <span className="text-lg font-bold text-primary">USDT</span>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs font-medium text-emerald-500 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-full">
              <Icon icon="solar:graph-up-bold" className="size-3" />
              <span>+2.4% this week</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-transform">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Icon icon="solar:plain-3-bold" className="size-6 text-white" />
            </div>
            <span className="text-xs font-bold">Send</span>
          </button>
          <button className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary text-secondary-foreground border border-border shadow-sm active:scale-95 transition-transform">
            <div className="size-10 rounded-full bg-background/50 flex items-center justify-center">
              <Icon icon="solar:users-group-rounded-bold" className="size-6 text-primary" />
            </div>
            <span className="text-xs font-semibold">Join Tontine</span>
          </button>
          <button className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary text-secondary-foreground border border-border shadow-sm active:scale-95 transition-transform">
            <div className="size-10 rounded-full bg-background/50 flex items-center justify-center">
              <Icon icon="solar:qr-code-bold" className="size-6 text-primary" />
            </div>
            <span className="text-xs font-semibold">Request</span>
          </button>
        </div>
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading">Recent Activity</h2>
            <button className="text-sm text-primary font-medium">See All</button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Icon icon="solar:arrow-left-down-bold" className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Payment Received</span>
                  <span className="text-xs text-muted-foreground">
                    From Alice M. • Today, 9:41 AM
                  </span>
                </div>
              </div>
              <span className="font-bold text-emerald-500">+ 450.00</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Icon icon="solar:shield-check-bold" className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Escrow Deposit</span>
                  <span className="text-xs text-muted-foreground">Project Alpha • Yesterday</span>
                </div>
              </div>
              <span className="font-bold text-foreground">- 1,200.00</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Icon icon="solar:users-group-rounded-bold" className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Tontine Contribution</span>
                  <span className="text-xs text-muted-foreground">Family Circle • Oct 24</span>
                </div>
              </div>
              <span className="font-bold text-foreground">- 200.00</span>
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-heading">My Circles</h2>
            <button className="text-sm text-primary font-medium">View All</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            <div className="min-w-[280px] bg-card p-4 rounded-2xl border border-border flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center text-white font-bold text-lg">
                    F
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Family Savings</h3>
                    <p className="text-xs text-muted-foreground">Monthly • 500 USDT</p>
                  </div>
                </div>
                <span className="bg-secondary px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground">
                  Active
                </span>
              </div>
              <div className="w-full h-px bg-border/50" />
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <img
                    src="https://randomuser.me/api/portraits/women/42.jpg"
                    className="size-6 rounded-full border-2 border-card"
                    alt="Member"
                  />
                  <img
                    src="https://randomuser.me/api/portraits/men/32.jpg"
                    className="size-6 rounded-full border-2 border-card"
                    alt="Member"
                  />
                  <img
                    src="https://randomuser.me/api/portraits/women/12.jpg"
                    className="size-6 rounded-full border-2 border-card"
                    alt="Member"
                  />
                  <div className="size-6 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold">
                    +4
                  </div>
                </div>
                <div className="text-xs text-right">
                  <p className="text-muted-foreground">Next Payout</p>
                  <p className="font-bold text-primary">Nov 01</p>
                </div>
              </div>
            </div>
            <div className="min-w-[280px] bg-card p-4 rounded-2xl border border-border flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    B
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Business Club</h3>
                    <p className="text-xs text-muted-foreground">Weekly • 1000 USDT</p>
                  </div>
                </div>
                <span className="bg-secondary px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground">
                  Active
                </span>
              </div>
              <div className="w-full h-px bg-border/50" />
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <img
                    src="https://randomuser.me/api/portraits/men/85.jpg"
                    className="size-6 rounded-full border-2 border-card"
                    alt="Member"
                  />
                  <img
                    src="https://randomuser.me/api/portraits/men/22.jpg"
                    className="size-6 rounded-full border-2 border-card"
                    alt="Member"
                  />
                  <div className="size-6 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold">
                    +8
                  </div>
                </div>
                <div className="text-xs text-right">
                  <p className="text-muted-foreground">Next Payout</p>
                  <p className="font-bold text-primary">Oct 28</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 mb-4">
          <div className="size-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Icon icon="solar:shield-check-bold" className="size-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-sm text-foreground">My Protection</h3>
            <p className="text-xs text-emerald-500 font-medium">Active Coverage • Premium Plan</p>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" className="ml-auto text-emerald-500" />
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-3 flex justify-between items-center z-50">
        <button className="flex flex-col items-center gap-1 text-primary">
          <Icon icon="solar:home-2-bold" className="size-6" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:wallet-money-bold" className="size-6" />
          <span className="text-[10px] font-medium">Payments</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:users-group-rounded-bold" className="size-6" />
          <span className="text-[10px] font-medium">Circles</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:shield-check-bold" className="size-6" />
          <span className="text-[10px] font-medium">Protection</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:user-bold" className="size-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
}
