'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const allocation = [
  { name: 'Stocks', value: 30, color: '#22d3ee' },
  { name: 'Forex', value: 25, color: '#a855f7' },
  { name: 'Real Estate', value: 25, color: '#eab308' },
  { name: 'IT Businesses', value: 20, color: '#10b981' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-lg z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="text-2xl font-semibold tracking-tight">PrivateCapital</div>
          <div className="flex gap-8 text-sm">
            <a href="#portfolio" className="hover:text-cyan-400 transition">Portfolio</a>
            <a href="#documents" className="hover:text-cyan-400 transition">Documents</a>
            <a href="#admin" className="hover:text-cyan-400 transition">Admin</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-6">
            Private Capital.<br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Structured for the Long Term.
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Premium investor portal for diversified long-term capital across public markets, real assets, and operating businesses.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-black rounded-2xl font-medium hover:bg-white/90 transition">
              Investor Login
            </button>
            <button className="px-8 py-4 border border-white/30 rounded-2xl hover:bg-white/5 transition">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Allocation Model */}
      <section id="portfolio" className="py-20 bg-zinc-900">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-semibold text-center mb-4">Four-Pool Allocation Model</h2>
          <p className="text-center text-zinc-400 mb-16">Diversified • Risk-Managed • Long-term Focus</p>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Chart */}
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} cx="50%" cy="50%" innerRadius={100} outerRadius={160} dataKey="value">
                    {allocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Details */}
            <div className="space-y-10">
              {allocation.map((pool, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-4 h-4 mt-2 rounded-full" style={{ backgroundColor: pool.color }}></div>
                  <div>
                    <div className="flex justify-between">
                      <h3 className="font-semibold text-xl">{pool.name}</h3>
                      <span className="text-2xl font-bold text-white/90">{pool.value}%</span>
                    </div>
                    <p className="text-zinc-400 mt-2">Lorem ipsum description for this pool...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features / Trust */}
      <section className="py-20 px-6 bg-zinc-950">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { title: 'Role-Based Access', desc: 'Investor & Admin portals with 2FA' },
            { title: 'Secure Documents', desc: 'Private storage with signed URLs' },
            { title: 'Risk Controls', desc: 'Transparent reporting and drawdown limits' },
          ].map((feature, i) => (
            <div key={i} className="bg-zinc-900/50 border border-white/10 p-8 rounded-3xl hover:border-cyan-500/30 transition">
              <h4 className="text-2xl font-semibold mb-3">{feature.title}</h4>
              <p className="text-zinc-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center text-zinc-500 text-sm border-t border-white/10">
        Prototype only • Not investment advice
      </footer>
    </div>
  );
}
