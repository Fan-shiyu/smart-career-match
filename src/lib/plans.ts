export type PlanId = "free" | "pro" | "premium";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  searchesPerDay: number;
  maxCVs: number;
  maxResults: number;
  features: { label: string; included: boolean }[];
  cta: string;
  popular?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "€0",
    description: "Get started with basic job matching",
    searchesPerDay: 5,
    maxCVs: 1,
    maxResults: 10,
    cta: "Start Free",
    features: [
      { label: "5 searches per day", included: true },
      { label: "Top 10 results only", included: true },
      { label: "1 stored CV", included: true },
      { label: "Quick Overview export", included: true },
      { label: "Basic match score", included: true },
      { label: "Commute calculation", included: false },
      { label: "Visa & IND sponsor filter", included: false },
      { label: "Match score breakdown", included: false },
      { label: "Save searches", included: false },
      { label: "AI CV keyword suggestions", included: false },
      { label: "Cover letter generator", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 14,
    priceLabel: "€14",
    description: "Unlock powerful matching & visa insights",
    searchesPerDay: -1, // unlimited
    maxCVs: 5,
    maxResults: 50,
    cta: "Upgrade to Pro",
    popular: true,
    features: [
      { label: "Unlimited searches", included: true },
      { label: "Top 50 results", included: true },
      { label: "5 stored CVs", included: true },
      { label: "Full export presets", included: true },
      { label: "Match score breakdown", included: true },
      { label: "Commute calculation", included: true },
      { label: "Visa & IND sponsor filter", included: true },
      { label: "Save searches", included: true },
      { label: "AI CV keyword suggestions", included: true },
      { label: "Cover letter generator", included: false },
      { label: "Priority processing", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 34,
    priceLabel: "€34",
    description: "Everything in Pro plus AI writing & priority",
    searchesPerDay: -1,
    maxCVs: -1,
    maxResults: 100,
    cta: "Upgrade to Premium",
    features: [
      { label: "Unlimited searches", included: true },
      { label: "Top 100 results", included: true },
      { label: "Unlimited stored CVs", included: true },
      { label: "Full export + raw text", included: true },
      { label: "Match score breakdown", included: true },
      { label: "Commute calculation", included: true },
      { label: "Visa optimization mode", included: true },
      { label: "Save searches", included: true },
      { label: "AI CV keyword suggestions", included: true },
      { label: "Cover letter generator", included: true },
      { label: "Priority processing", included: true },
    ],
  },
];

export function getPlanConfig(planId: PlanId): PlanConfig {
  return PLANS.find((p) => p.id === planId) || PLANS[0];
}
