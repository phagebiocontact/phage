import { createDodoWebhookHandler } from "@dodopayments/convex";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
const WEBHOOK_MAX_AGE_SECONDS = 300;
const textEncoder = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signWebhook(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(`${timestamp}.${body}`)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

auth.addHttpRoutes(http);

http.route({
  path: "/simulation-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const expectedSecret = process.env.SIM_WEBHOOK_SECRET;
      const rawBody = await request.text();
      if (expectedSecret) {
        const timestamp = request.headers.get("x-simulation-webhook-timestamp");
        const signature = request.headers.get("x-simulation-webhook-signature");

        if (!timestamp || !signature) {
          return new Response(
            JSON.stringify({ ok: false, error: "missing_signature_headers" }),
            { status: 401, headers: { "content-type": "application/json" } }
          );
        }

        const ts = Number.parseInt(timestamp, 10);
        if (!Number.isFinite(ts)) {
          return new Response(
            JSON.stringify({ ok: false, error: "invalid_timestamp" }),
            { status: 401, headers: { "content-type": "application/json" } }
          );
        }

        const nowSec = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSec - ts) > WEBHOOK_MAX_AGE_SECONDS) {
          return new Response(
            JSON.stringify({ ok: false, error: "stale_timestamp" }),
            { status: 401, headers: { "content-type": "application/json" } }
          );
        }

        const expectedSig = await signWebhook(expectedSecret, timestamp, rawBody);
        if (!timingSafeEqual(signature, expectedSig)) {
          return new Response(
            JSON.stringify({ ok: false, error: "unauthorized" }),
            { status: 401, headers: { "content-type": "application/json" } }
          );
        }
      }

      const body = JSON.parse(rawBody) as {
        job_id?: string;
        status?: string;
        current_step?: string;
        progress_percent?: number;
        time_elapsed_seconds?: number;
        details?: string;
        error?: string;
        error_details?: string;
      };

      if (!body.job_id || !body.status) {
        return new Response(
          JSON.stringify({ ok: false, error: "missing_job_or_status" }),
          { status: 400, headers: { "content-type": "application/json" } }
        );
      }

      const result = await ctx.runAction(api.actions.handleSimulationWebhook, {
        jobId: body.job_id,
        status: body.status,
        currentStep: body.current_step,
        progressPercent: body.progress_percent,
        timeElapsedSeconds: body.time_elapsed_seconds,
        details: body.details,
        error: body.error,
        errorDetails: body.error_details,
      });

      return new Response(JSON.stringify({ ok: true, result }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unexpected_error";
      return new Response(
        JSON.stringify({ ok: false, error: message }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/dodopayments-webhook",
  method: "POST",
  handler: createDodoWebhookHandler({
    onPaymentSucceeded: async (ctx, payload) => {
      console.log("Dodo Payment Succeeded:", JSON.stringify(payload, null, 2));
      const metadata = (payload?.data as any)?.metadata ?? {};
      const userId: string | undefined =
        metadata.user_id ?? metadata.userId ?? metadata.customer_id;
      const creditsRaw: string | number | undefined = metadata.credits ?? metadata.credit_amount;
      const credits = Number(creditsRaw);
      const paymentId = payload.data?.payment_id ?? "unknown";
      const amountInCents = (payload.data as any)?.amount ?? 0;
      const paymentMethod = (payload.data as any)?.payment_method ?? undefined;

      if (!userId) {
        console.error("No userId found in metadata", metadata);
        return;
      }

      try {
        await ctx.runMutation(api.payments.logPaymentEvent, {
          eventId: paymentId,
          type: payload.type ?? "payment.succeeded",
          paymentId,
          userId: userId as any,
          credits,
        });
      } catch (err) {
        console.error("Failed to log payment event:", err);
      }

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
      } catch (err) {
        console.error("Failed to store payment transaction:", err);
      }

      if (Number.isFinite(credits) && credits > 0) {
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
        } catch (err) {
          console.error("Failed to apply credits to user:", err);
        }
      }
    },
    onPaymentFailed: async (ctx, payload) => {
      console.log("Dodo Payment Failed:", JSON.stringify(payload, null, 2));
      const metadata = (payload?.data as any)?.metadata ?? {};
      const userId: string | undefined =
        metadata.user_id ?? metadata.userId ?? metadata.customer_id;
      const creditsRaw: string | number | undefined = metadata.credits ?? metadata.credit_amount;
      const _credits = Number(creditsRaw);
      const paymentId = payload.data?.payment_id ?? "unknown";
      const amountInCents = (payload.data as any)?.amount ?? 0;

      if (userId) {
        try {
          await ctx.runMutation(api.payments.logPaymentEvent, {
            eventId: paymentId,
            type: payload.type ?? "payment.failed",
            paymentId,
            userId: userId as any,
            credits: 0,
          });
        } catch (err) {
          console.error("Failed to log payment failed event:", err);
        }

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
        } catch (err) {
          console.error("Failed to store payment failed transaction:", err);
        }
      }
    },
    onRefundSucceeded: async (ctx, payload) => {
      console.log("Dodo Refund Succeeded:", JSON.stringify(payload, null, 2));
      const metadata = (payload?.data as any)?.metadata ?? {};
      const userId: string | undefined =
        metadata.user_id ?? metadata.userId ?? metadata.customer_id;
      const creditsRaw: string | number | undefined = metadata.credits ?? metadata.credit_amount;
      const credits = Number(creditsRaw);
      const paymentId = (payload.data as any)?.payment_id ?? "unknown";

      if (userId) {
        try {
          await ctx.runMutation(api.payments.logPaymentEvent, {
            eventId: `${paymentId}:refund`,
            type: "refund.succeeded",
            paymentId,
            userId: userId as any,
            credits,
          });
        } catch (err) {
          console.error("Failed to log refund event:", err);
        }
      }
    },
  }),
});
export default http;
