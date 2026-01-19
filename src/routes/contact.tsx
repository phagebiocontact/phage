import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useAction, useMutation } from "convex/react";
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
	const submitContactForm = useMutation(api.contact.submitContactForm);
	const sendEmail = useAction(api.emails?.sendContactEmail);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			category: "",
			subject: "",
			message: "",
		},
		onSubmit: async ({ value }) => {
			try {
				// Save to database
				await submitContactForm({
					name: value.name,
					email: value.email,
					subject: `[${value.category}] ${value.subject}`,
					message: value.message,
				});

				// Send email via Resend
				try {
					if (sendEmail) {
						await sendEmail({
							name: value.name,
							email: value.email,
							subject: `[${value.category}] ${value.subject}`,
							message: value.message,
						});
						toast.success(
							"Message sent successfully! We'll get back to you soon.",
						);
					} else {
						console.warn("Email API not ready, skipped sending email.");
						toast.success("Message saved! We'll respond shortly.");
					}
				} catch (emailError) {
					console.error("Email sending failed:", emailError);
					toast.success("Message saved! We'll respond via email shortly.");
				}

				// Reset form
				form.reset();
			} catch (error) {
				console.error("Error submitting form:", error);
				toast.error("Failed to send message. Please try again.");
			}
		},
	});

	return (
		<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
			<CardHeader>
				<CardTitle>Send us a message</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div className="grid gap-4 md:grid-cols-2">
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Your name"
										required
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="you@example.com"
										required
									/>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="category">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="category">Category</Label>
								<Select
									value={field.state.value}
									onValueChange={(value) => field.handleChange(value)}
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
						)}
					</form.Field>
					<form.Field name="subject">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="subject">Subject</Label>
								<Input
									id="subject"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="How can we help?"
									required
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="message">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="message">Message</Label>
								<Textarea
									className="min-h-[150px]"
									id="message"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="Tell us more about your inquiry..."
									required
								/>
							</div>
						)}
					</form.Field>
					<Button
						className="w-full bg-gradient-primary shadow-glow transition-opacity hover:opacity-90"
						disabled={form.state.isSubmitting}
						type="submit"
					>
						{form.state.isSubmitting ? "Sending..." : "Send Message"}
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
