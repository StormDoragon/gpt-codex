'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { pools } from '../lib/sample-data';

export function AllocationChart() {
  return (
    <div>
      {/* Decorative: the legend below states every value in text. */}
      <div className="chart-shell" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          {/* No keyboard layer: it is decorative and hidden from assistive tech, so it must not take focus. */}
          <PieChart accessibilityLayer={false}>
            <Pie
              rootTabIndex={-1}
              data={pools}
              dataKey="allocation"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              stroke="none"
            >
              {pools.map((pool) => (
                <Cell key={pool.name} fill={pool.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="chart-legend" aria-label="Allocation by pool">
        {pools.map((pool) => (
          <li key={pool.name}>
            <span className="pool-dot" style={{ background: pool.color }} />
            {pool.name} · {pool.allocation}%
          </li>
        ))}
      </ul>
    </div>
  );
}
