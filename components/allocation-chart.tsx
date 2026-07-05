'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { pools } from '../lib/platform-data';

export function AllocationChart() {
  return (
    <div>
      <div className="chart-shell">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
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
      <ul className="chart-legend">
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
