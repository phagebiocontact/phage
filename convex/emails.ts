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
    const brevoApiKey = process.env.BREVO_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL
    const senderEmail = process.env.BREVO_SENDER_EMAIL
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY not configured");
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "Phage Contact Form",
            email: senderEmail,
          },
          to: [
            {
              email: adminEmail,
              name: "Admin",
            },
          ],
          replyTo: {
            email: args.email,
            name: args.name,
          },
          subject: `[Contact Form] ${args.subject}`,
          htmlContent: `
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
        console.error("Brevo API error:", error);
        throw new Error(`Failed to send email: ${error}`);
      }

      const data = await response.json();
      console.log("Email sent successfully:", data);
      return { success: true, messageId: data.messageId };
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  },
});
