import { DodoPayments } from "@dodopayments/convex";
import { components } from "./_generated/api";
export const dodo = new DodoPayments(components.dodopayments, {
  identify: async (_ctx) => {
    return null;
  },
  apiKey: process.env.DODO_PAYMENTS_API_KEY!,
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode",
});
export const { checkout, customerPortal } = dodo.api();
