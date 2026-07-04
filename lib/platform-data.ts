export type Pool = {
  name: string;
  allocation: number;
  description: string;
  risk: string;
};

export type Metric = {
  label: string;
  value: string;
  note: string;
};

export const platform = {
  name: "Global Standard Capital",
  tagline: "Private Capital. Structured for the Long Term.",
  minimumInvestment: "$1,200",
  lockPeriod: "3 years",
  disclaimer:
    "This is a product prototype. It does not process real deposits or withdrawals and does not constitute an offer to sell securities or investment advice."
};

export const pools: Pool[] = [
  {
    name: "Stocks",
    allocation: 30,
    description: "Long-term public market exposure with disciplined position sizing, reporting, and risk controls.",
    risk: "Market volatility, company-specific risk, and liquidity risk."
  },
  {
    name: "Forex",
    allocation: 25,
    description: "Currency strategy exposure with strict drawdown controls and transparent performance reporting.",
    risk: "Leverage, counterparty, macro, and execution risk."
  },
  {
    name: "Real Estate",
    allocation: 25,
    description: "Real asset exposure focused on income potential, asset-backed value, and multi-year compounding.",
    risk: "Illiquidity, valuation changes, interest-rate risk, and property-level risk."
  },
  {
    name: "IT Businesses",
    allocation: 20,
    description: "Operating-business exposure across digital infrastructure, software, automation, and service businesses.",
    risk: "Execution, revenue concentration, technology, and operator risk."
  }
];

export const investorMetrics: Metric[] = [
  { label: "Total committed capital", value: "$12,000", note: "Sample investor account" },
  { label: "Active investment", value: "$12,000", note: "Demo data only" },
  { label: "Pending deposit", value: "$0", note: "No live payments enabled" },
  { label: "Withdrawal eligibility", value: "Jan 1, 2029", note: "Based on 3-year lock" }
];

export const performanceRows = [
  { period: "Jan 2026", result: "+1.4%", drawdown: "-0.8%", note: "Demo monthly performance" },
  { period: "Feb 2026", result: "+0.9%", drawdown: "-1.1%", note: "Demo monthly performance" },
  { period: "Mar 2026", result: "-0.6%", drawdown: "-2.2%", note: "Demo monthly performance" },
  { period: "Q1 2026", result: "+1.7%", drawdown: "-2.2%", note: "Unaudited sample data" }
];

export const adminQueues = [
  { name: "Investor applications", count: 8, status: "Needs review" },
  { name: "Deposit requests", count: 3, status: "Pending approval" },
  { name: "Withdrawal requests", count: 1, status: "Lock check required" },
  { name: "Document reviews", count: 5, status: "Compliance queue" }
];

export const securityControls = [
  "HTTPS-only deployment",
  "Role-based investor and admin access",
  "Two-factor authentication placeholder",
  "Private document storage with signed URLs",
  "Audit logs for every money-related action",
  "Admin review before payment instructions are released",
  "No live custody, deposit, or withdrawal processing in MVP"
];
