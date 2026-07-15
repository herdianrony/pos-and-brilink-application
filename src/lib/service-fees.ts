import type { AgentService, FeeTier } from "@/types/models";

export interface CalculatedFee {
  adminFee: number;
  agentFee: number;
  tier: FeeTier | null;
}

export function calculateServiceFee(amount: number, service: Pick<AgentService, "adminFee" | "agentFee" | "useTieredFee" | "feeTiers">): CalculatedFee {
  if (!service.useTieredFee || service.feeTiers.length === 0) {
    return {
      adminFee: parseFloat(service.adminFee) || 0,
      agentFee: parseFloat(service.agentFee) || 0,
      tier: null,
    };
  }

  for (const tier of service.feeTiers) {
    const min = parseFloat(tier.minAmount) || 0;
    const max = tier.maxAmount ? parseFloat(tier.maxAmount) : Infinity;
    if (amount >= min && amount <= max) {
      return {
        adminFee: parseFloat(tier.adminFee) || 0,
        agentFee: parseFloat(tier.agentFee) || 0,
        tier,
      };
    }
  }

  return {
    adminFee: parseFloat(service.adminFee) || 0,
    agentFee: parseFloat(service.agentFee) || 0,
    tier: null,
  };
}

export function calculateAgentProfit(agentFee: number): number {
  return agentFee;
}

export function calculateTotalWithAdminFee(amount: number, adminFee: number): number {
  return amount + adminFee;
}
