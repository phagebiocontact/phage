import { createDodoWebhookHandler } from "@dodopayments/convex";
import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/dodopayments-webhook",
  method: "POST",
  handler: createDodoWebhookHandler({
    onPaymentSucceeded: async (ctx, payload) => {
      const metadata = (payload?.data as any)?.metadata ?? {};
      const userId: string | undefined =
        metadata.user_id ?? metadata.userId ?? metadata.customer_id;
      const creditsRaw: string | number | undefined = metadata.credits ?? metadata.credit_amount;
      const credits = Number(creditsRaw);
      const paymentId = payload.data?.payment_id ?? "unknown";
      const amountInCents = (payload.data as any)?.amount ?? 0;
      const paymentMethod = (payload.data as any)?.payment_method ?? undefined;
      try {
        await ctx.runMutation(api.payments.logPaymentEvent, {
          eventId: paymentId,
          type: payload.type ?? "payment.succeeded",
          paymentId,
          userId: userId ? (userId as any) : undefined,
          credits,
        });
      } catch {}
      if (userId && paymentId) {
        try {
          await ctx.runMutation(api.payments.storePaymentTransaction, {
            userId: userId as any,
            paymentId,
            credits: credits || 0,
            amountInCents,
            status: "succeeded",
            paymentMethod,
            transactionId: paymentId,
            metadata: payload.data,
          });
        } catch {}
      }
      if (userId && Number.isFinite(credits) && credits > 0) {
        try {
          await ctx.runMutation(api.payments.applyCreditsToUser, {
            userId: userId as any,
            credits,
          });
          await ctx.runMutation(api.payments.logPaymentEvent, {
            eventId: `${paymentId as string}:resolved`,
            type: "payment.credited",
            paymentId,
            userId: userId as any,
            credits,
          });
        } catch {}
      }
    },
    onPaymentFailed: async (ctx, payload) => {
      const metadata = (payload?.data as any)?.metadata ?? {};
      const userId: string | undefined =
        metadata.user_id ?? metadata.userId ?? metadata.customer_id;
      const creditsRaw: string | number | undefined = metadata.credits ?? metadata.credit_amount;
      const _credits = Number(creditsRaw);
      const paymentId = payload.data?.payment_id ?? "unknown";
      const amountInCents = (payload.data as any)?.amount ?? 0;
      try {
        await ctx.runMutation(api.payments.logPaymentEvent, {
          eventId: paymentId,
          type: payload.type ?? "payment.failed",
          paymentId,
          userId: userId ? (userId as any) : undefined,
          credits: 0,
        });
      } catch {}
      if (userId && paymentId) {
        try {
          await ctx.runMutation(api.payments.storePaymentTransaction, {
            userId: userId as any,
            paymentId,
            credits: 0,
            amountInCents,
            status: "failed",
            transactionId: paymentId,
            metadata: payload.data,
          });
        } catch {}
      }
    },
    onRefundSucceeded: async (ctx, payload) => {
      const metadata = (payload?.data as any)?.metadata ?? {};
      const userId: string | undefined =
        metadata.user_id ?? metadata.userId ?? metadata.customer_id;
      const creditsRaw: string | number | undefined = metadata.credits ?? metadata.credit_amount;
      const credits = Number(creditsRaw);
      const paymentId = (payload.data as any)?.payment_id ?? "unknown";
      try {
        await ctx.runMutation(api.payments.logPaymentEvent, {
          eventId: `${paymentId}:refund`,
          type: "refund.succeeded",
          paymentId,
          userId: userId ? (userId as any) : undefined,
          credits,
        });
      } catch {}
    },
  }),
});
export default http;
