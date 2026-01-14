import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/contact")({
	component: Contact,
});

const ContactFormInner = () => {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		category: "",
		subject: "",
		message: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitContactForm = useMutation(api.contact.submitContactForm);
	const sendEmail = useAction(api.emails?.sendContactEmail);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			// Save to database
			await submitContactForm({
				name: formData.name,
				email: formData.email,
				subject: `[${formData.category}] ${formData.subject}`,
				message: formData.message,
			});

			// Send email via Resend
			try {
				if (sendEmail) {
					await sendEmail({
						name: formData.name,
						email: formData.email,
						subject: `[${formData.category}] ${formData.subject}`,
						message: formData.message,
					});
					toast.success(
						"Message sent successfully! We'll get back to you soon.",
					);
				} else {
					// If email API is not ready, just log or skip
					console.warn("Email API not ready, skipped sending email.");
					toast.success("Message saved! We'll respond shortly.");
				}
			} catch (emailError) {
				// Email failed but form was saved
				console.error("Email sending failed:", emailError);
				toast.success("Message saved! We'll respond via email shortly.");
			}

			setFormData({
				name: "",
				email: "",
				category: "",
				subject: "",
				message: "",
			});
		} catch (error) {
			console.error("Error submitting form:", error);
			toast.error("Failed to send message. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
			<CardHeader>
				<CardTitle>Send us a message</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Your name"
								required
								value={formData.name}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="you@example.com"
								required
								type="email"
								value={formData.email}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="category">Category</Label>
						<Select
							onValueChange={(value) =>
								setFormData({ ...formData, category: value })
							}
							value={formData.category}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a topic" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="general">General Inquiry</SelectItem>
								<SelectItem value="support">Technical Support</SelectItem>
								<SelectItem value="billing">Billing & Credits</SelectItem>
								<SelectItem value="partnership">Partnership</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="subject">Subject</Label>
						<Input
							id="subject"
							onChange={(e) =>
								setFormData({ ...formData, subject: e.target.value })
							}
							placeholder="How can we help?"
							required
							value={formData.subject}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="message">Message</Label>
						<Textarea
							className="min-h-[150px]"
							id="message"
							onChange={(e) =>
								setFormData({ ...formData, message: e.target.value })
							}
							placeholder="Tell us more about your inquiry..."
							required
							value={formData.message}
						/>
					</div>
					<Button
						className="w-full bg-gradient-primary shadow-glow transition-opacity hover:opacity-90"
						disabled={isSubmitting}
						type="submit"
					>
						{isSubmitting ? "Sending..." : "Send Message"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
};

function Contact() {
	const quickFaqs = [
		{
			question: "How do I upload files?",
			answer:
				"Go to the Simulate page and use the drag-and-drop interface to upload your PDB or SDF files. Files must be under 10MB.",
		},
		{
			question: "What happens if my simulation fails?",
			answer:
				"If a simulation fails due to a system error, your credits are automatically refunded. You can check the status in the Jobs page.",
		},
		{
			question: "Can I cancel a running simulation?",
			answer:
				"Yes, you can cancel a simulation from the Jobs page. Partially used credits may not be refunded depending on the stage of cancellation.",
		},
		{
			question: "How do I purchase more credits?",
			answer:
				"Visit the Pricing page to purchase credit packages or a custom amount. We accept major credit cards.",
		},
	];

	return (
		<div className="min-h-screen bg-background">
			<div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
				{/* Background elements */}
				<div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />
				<div className="container relative mx-auto px-4">
					<div className="text-center mb-16 max-w-2xl mx-auto">
						<h1 className="text-4xl md:text-5xl font-bold mb-6">
							Get in <span className="text-gradient">Touch</span>
						</h1>
						<p className="text-muted-foreground text-lg">
							Have questions about our platform or need technical support? We're
							here to help you accelerate your research.
						</p>
					</div>

					<div className="grid lg:grid-cols-2 gap-12 items-start">
						{/* Left side - FAQs */}
						<div className="space-y-8">
							<div>
								<h2 className="text-2xl font-bold mb-6">
									Frequently Asked Questions
								</h2>
								<Accordion type="single" collapsible className="w-full">
									{quickFaqs.map((faq, i) => (
										<AccordionItem key={i} value={`item-${i}`}>
											<AccordionTrigger>{faq.question}</AccordionTrigger>
											<AccordionContent>{faq.answer}</AccordionContent>
										</AccordionItem>
									))}
								</Accordion>
							</div>

							<div className="p-6 rounded-2xl bg-secondary/5 border border-secondary/10">
								<h3 className="font-semibold text-lg mb-2 text-secondary">
									Office Hours
								</h3>
								<p className="text-muted-foreground">
									Monday - Friday: 9:00 AM - 6:00 PM EST
									<br />
									Weekend: Closed
								</p>
							</div>
						</div>

						{/* Right side - Form */}
						<div className="lg:pl-8">
							<ContactFormInner />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
