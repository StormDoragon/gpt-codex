// Illustrative data for the investor-dashboard preview. Nothing here is real:
// the dashboard is labelled "sample data" until reporting ships.

export type Metric = {
  label: string;
  value: string;
  note: string;
};

export const sampleFund = { name: 'Sample Fund I' } as const;

export const pools = [
  { name: 'Public equities', allocation: 30, color: '#63d5ff' },
  { name: 'Credit', allocation: 25, color: '#e2b75e' },
  { name: 'Real estate', allocation: 25, color: '#73e2a7' },
  { name: 'Operating businesses', allocation: 20, color: '#b48cf2' },
];

export const investorMetrics: Metric[] = [
  { label: 'Total commitment', value: '$12,000', note: 'Sample investor' },
  { label: 'Capital called', value: '$9,000', note: 'Sample data' },
  { label: 'Distributions to date', value: '$420', note: 'Sample data' },
  { label: 'Lock-up ends', value: 'Jan 1, 2029', note: 'Based on a 3-year lock-up' },
];

export const performanceRows = [
  { period: 'Jan 2026', result: '+1.4%', drawdown: '-0.8%', note: 'Sample monthly performance' },
  { period: 'Feb 2026', result: '+0.9%', drawdown: '-1.1%', note: 'Sample monthly performance' },
  { period: 'Mar 2026', result: '-0.6%', drawdown: '-2.2%', note: 'Sample monthly performance' },
  { period: 'Q1 2026', result: '+1.7%', drawdown: '-2.2%', note: 'Unaudited sample data' },
];
