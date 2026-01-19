import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalQuery, mutation } from "./_generated/server";
export const createCheckoutSession = action({
  args: {
    userId: v.id("users"),
    credits: v.number(),
    currency: v.optional(v.string()),
    country: v.optional(v.string()),
    billingAddress: v.optional(
      v.object({
        street: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
      }),
    ),
    paymentMethods: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PAYMENTS_PRODUCT_ID;
    const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL;
    if (!(apiKey && productId && returnUrl)) {
      throw new Error(
        "Dodo Payments env is not configured. Please set DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_PRODUCT_ID, DODO_PAYMENTS_RETURN_URL",
      );
    }
    if (!Number.isFinite(args.credits) || args.credits <= 0) {
      throw new Error("credits must be a positive number");
    }
    const user = await ctx.runQuery((internal as any).payments.getUser, {
      userId: args.userId,
    });
    if (!user) {
      throw new Error("User not found");
    }
    const { email: userEmail = "", name: userName = "", _id: userId } = user;
    const amountInCents = Math.round((args.credits / 10) * 100);
    const environment = process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode";
    const baseUrl =
      environment === "live_mode"
        ? "https://live.dodopayments.com"
        : "https://test.dodopayments.com";

    // Detect country from billing address or args
    const detectedCountry = args.billingAddress?.country || args.country || "US";

    // Adaptive currency based on country
    let billingCurrency = args.currency || "USD";
    if (!args.currency) {
      // Auto-detect currency based on country
      const currencyMap: Record<string, string> = {
        IN: "INR",
        GB: "GBP",
        CA: "CAD",
        AU: "AUD",
        EU: "EUR",
        DE: "EUR",
        FR: "EUR",
        IT: "EUR",
        ES: "EUR",
        NL: "EUR",
        JP: "JPY",
        SG: "SGD",
        AE: "AED",
      };
      billingCurrency = currencyMap[detectedCountry] || "USD";
    }

    // Payment methods with UPI support for India
    let paymentMethods = args.paymentMethods || ["credit", "debit"];
    if (!args.paymentMethods && detectedCountry === "IN") {
      // Add UPI payment methods for Indian customers
      paymentMethods = ["upi_collect", "upi_intent", "credit", "debit"];
    }
    const billing_address = args.billingAddress
      ? {
        street: args.billingAddress.street,
        city: args.billingAddress.city,
        state: args.billingAddress.state,
        zipcode: args.billingAddress.postalCode,
        country: args.billingAddress.country,
      }
      : undefined;
    const idempotencyKey = (
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    ).toString();
    const maxRetries = 2;
    const timeoutMs = 15_000;
    async function postWithRetry(): Promise<Response> {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(`${baseUrl}/checkouts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "Idempotency-Key": idempotencyKey,
            },
            signal: controller.signal,
            body: JSON.stringify({
              product_cart: [
                {
                  product_id: productId,
                  quantity: 1,
                  amount: amountInCents,
                },
              ],
              customer: {
                email: userEmail,
                name: userName,
              },
              allowed_payment_method_types: paymentMethods,
              return_url: returnUrl!,
              billing_currency: billingCurrency,
              ...(billing_address ? { billing_address } : {}),
              metadata: {
                user_id: String(userId),
                credits: String(args.credits),
                source: "phage_web",
              },
            }),
          });
          clearTimeout(timer);
          if (res.status >= 500 && res.status < 600 && attempt < maxRetries) {
            const jitter = 200 * (attempt + 1) + Math.floor(Math.random() * 200);
            await new Promise((r) => setTimeout(r, jitter));
            continue;
          }
          return res;
        } catch (e) {
          clearTimeout(timer);
          lastErr = e;
          if (attempt < maxRetries) {
            const jitter = 250 * (attempt + 1) + Math.floor(Math.random() * 250);
            await new Promise((r) => setTimeout(r, jitter));
            continue;
          }
          throw e;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("Unknown network error");
    }
    const response = await postWithRetry();
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`Dodo API error: ${response.status} - ${errorText}`);
      throw new Error(`Dodo API error: ${response.status} - ${errorText || "Unknown error"}`);
    }
    const session = await response.json();
    console.log("Dodo Checkout Session Created:", (session as any).session_id);
    return {
      checkout_url: (session as any).checkout_url,
      session_id: (session as any).session_id,
    };
  },
});
export const logPaymentEvent = mutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    paymentId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    credits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      console.error("userId is required for payment events");
      return;
    }
    await ctx.db.insert("transactions", {
      userId: args.userId,
      amount: 0,
      credits: args.credits || 0,
      status: args.type,
      createdAt: Date.now(),
    });
  },
});
export const applyCreditsToUser = mutation({
  args: {
    userId: v.id("users"),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`Applying ${args.credits} credits to user ${args.userId}`);
    if (args.credits <= 0) {
      return;
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.error(`User ${args.userId} not found for applying credits`);
      return;
    }
    const currentCredits = user.credits ?? 0;
    const newCredits = currentCredits + args.credits;
    await ctx.db.patch(args.userId, { credits: newCredits });
    console.log(`Updated user ${args.userId} credits from ${currentCredits} to ${newCredits}`);
  },
});
export const storePaymentTransaction = mutation({
  args: {
    userId: v.id("users"),
    paymentId: v.string(),
    credits: v.number(),
    amountInCents: v.number(),
    status: v.string(),
    paymentMethod: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log(`Storing payment transaction for user ${args.userId}, amount: ${args.amountInCents / 100}`);
    await ctx.db.insert("transactions", {
      userId: args.userId,
      amount: args.amountInCents / 100, // Convert from cents to dollars
      credits: args.credits,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});
export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
export const createCheckout = createCheckoutSession;
