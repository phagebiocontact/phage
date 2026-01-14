import { v } from "convex/values";
import { action } from "./_generated/server";
export const sendContactEmail = action({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (_ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Phage <onboarding@resend.dev>",
          to: ["contact@yourcompany.com"],
          reply_to: args.email,
          subject: `[Contact Form] ${args.subject}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${args.name} (${args.email})</p>
            <p><strong>Subject:</strong> ${args.subject}</p>
            <hr />
            <p>${args.message.replace(/\n/g, "<br>")}</p>
          `,
        }),
      });
      if (!response.ok) {
        const error = await response.text();
        console.error("Resend API error:", error);
        throw new Error(`Failed to send email: ${error}`);
      }
      const data = await response.json();
      console.log("Email sent successfully:", data);
      return { success: true, id: data.id };
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  },
});
