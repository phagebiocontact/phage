import { createFileRoute } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { ArrowRight, Check, DollarSign, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
	CurrencySelector,
	convertPrice,
	detectUserCurrency,
	formatPrice,
	useLiveCurrencyRates,
} from "@/components/CurrencySelector";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { convex } from "@/lib/convex";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const pricingSearchSchema = z.object({
	status: z.string().optional(),
	session_id: z.string().optional(),
});

export const Route = createFileRoute("/pricing")({
	validateSearch: (search) => pricingSearchSchema.parse(search),
	component: Pricing,
});

const PricingContentInner = ({ user }: { user: any }) => {
	const search = Route.useSearch();
	const [isLoading, setIsLoading] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const createCheckout = useAction(api.payments.createCheckout);
	const [selectedCredits, setSelectedCredits] = useState(1000);
	const [selectedCurrency, setSelectedCurrency] = useState(() =>
		detectUserCurrency(),
	);

	// Use live currency rates
	const {
		currencies,
		isLoading: isLoadingRates,
		lastUpdate,
		updateRates,
	} = useLiveCurrencyRates();

	useEffect(() => {
		setIsVisible(true);

		if (search.status === "succeeded" || search.status === "success") {
			toast.success("Payment successful!", {
				description: "Your credits have been updated.",
			});
		} else if (search.status === "failed" || search.status === "cancel") {
			toast.error("Payment failed", {
				description:
					"Please try again or contact support if the issue persists.",
			});
		}
	}, [search.status]);

	const creditOptions = [
		{
			credits: 500,
			label: "Starter",
			description: "Perfect for testing",
			popular: false,
		},
		{
			credits: 1000,
			label: "Standard",
			description: "Most popular choice",
			popular: true,
		},
		{
			credits: 2000,
			label: "Pro",
			description: "For power users",
			popular: false,
		},
	];

	const creditsNeeded = selectedCredits;
	const costInUSD = creditsNeeded / 10;
	const costInSelectedCurrency = convertPrice(costInUSD, selectedCurrency);
	const formattedPrice = formatPrice(costInSelectedCurrency, selectedCurrency);

	// Get country code from selected currency
	const getCountryFromCurrency = (currencyCode: string): string => {
		const currencyToCountry: Record<string, string> = {
			INR: "IN",
			GBP: "GB",
			CAD: "CA",
			AUD: "AU",
			EUR: "DE",
			JPY: "JP",
			SGD: "SG",
			AED: "AE",
			USD: "US",
		};
		return currencyToCountry[currencyCode] || "US";
	};

	const handleBuyCredits = async () => {
		if (!user) {
			toast.error("Sign in required", {
				description: "Please sign in to purchase credits.",
			});
			return;
		}
		if (creditsNeeded <= 0) {
			toast.error("Invalid amount", {
				description: "Please enter a positive number of credits.",
			});
			return;
		}

		try {
			setIsLoading(true);
			const res = await createCheckout({
				userId: user.id as Id<"users">,
				credits: creditsNeeded,
				currency: selectedCurrency,
				country: getCountryFromCurrency(selectedCurrency),
			});

			const url = (res as any)?.checkout_url as string | undefined;
			if (url) {
				window.location.href = url;
			} else {
				toast.error("Checkout link missing", {
					description: "Failed to generate a checkout URL. Please try again.",
				});
			}
		} catch (err) {
			toast.error("Payment error", {
				description:
					err instanceof Error
						? err.message
						: "Could not start checkout. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const benefits = [
		{ icon: <Check className="h-5 w-5" />, text: "No subscription required" },
		{ icon: <Check className="h-5 w-5" />, text: "Credits never expire" },
		{
			icon: <Check className="h-5 w-5" />,
			text: "Automatic refunds on failed simulations",
		},
		{
			icon: <Zap className="h-5 w-5" />,
			text: "5 free credits for new users",
			highlight: true,
		},
	];

	const faqs = [
		{
			question: "How does the credit system work?",
			answer:
				"Each credit allows you to run 1 nanosecond of molecular dynamics simulation. You can purchase credits at a rate of 10 credits per dollar. Credits never expire and can be used whenever you need them.",
		},
		{
			question: "What do I get with the 5 free credits?",
			answer:
				"New users receive 5 free credits to try out the platform. This is enough to run a 5 nanosecond simulation, perfect for testing the service with your research.",
		},
		{
			question: "Are there any subscription fees?",
			answer:
				"No! Phage uses a simple pay-as-you-go model. You only pay for the simulation time you use. There are no monthly subscriptions, hidden fees, or minimum commitments.",
		},
		{
			question: "What file formats are supported?",
			answer:
				"We support PDB (Protein Data Bank) files for proteins and SDF (Structure Data File) for ligands. Files must be under 10MB in size.",
		},
		{
			question: "How long do simulations take to complete?",
			answer:
				"Simulation time varies based on the complexity of your system and simulation parameters. Most simulations complete within minutes to a few hours. You can monitor progress in real-time on the Jobs page.",
		},
		{
			question: "Can I get a refund if something goes wrong?",
			answer:
				"Yes! If a simulation fails due to an error on our end, your credits will be automatically refunded. You're only charged for successful simulations.",
		},
	];

	return (
		<>
			{/* Hero Section */}
			<section className="relative pt-32 pb-16 overflow-hidden">
				<div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />
				<div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float opacity-50 pointer-events-none" />
				<div className="absolute bottom-0 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float delay-300 opacity-40 pointer-events-none" />
				<div className="container relative mx-auto px-4">
					<div className="mx-auto max-w-4xl text-center">
						<span
							className={`inline-block mb-6 px-5 py-2.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
						>
							Simple, Transparent Pricing
						</span>
						<h1
							className={`mb-8 font-bold text-5xl md:text-6xl lg:text-7xl leading-tight transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
						>
							Pay Only for What You{" "}
							<span className="text-gradient">Actually Use</span>
						</h1>
						<p
							className={`text-muted-foreground text-xl md:text-2xl max-w-2xl mx-auto transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
						>
							No subscriptions, no hidden fees. Just straightforward pricing
							based on simulation time.
						</p>
					</div>
				</div>
			</section>

			{/* Pricing Card Section */}
			<section className="py-12 relative">
				<div className="container mx-auto px-4">
					<div className="mx-auto max-w-4xl">
						<Card className="relative border-primary/20 bg-gradient-to-br from-card via-card to-card/80 shadow-xl backdrop-blur-sm overflow-hidden">
							{/* Card Background Effects */}
							<div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
							<div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

							<CardHeader className="relative pb-8 text-center">
								<div className="inline-flex items-center justify-center gap-2 mb-4">
									<div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
										<Sparkles className="h-6 w-6 text-white" />
									</div>
								</div>
								<CardTitle className="mb-2 font-bold text-3xl md:text-4xl">
									Credit-Based Pricing
								</CardTitle>
								<p className="text-muted-foreground text-lg">
									Simple and transparent
								</p>
							</CardHeader>

							<CardContent className="relative space-y-8">
								{/* Currency Selector */}
								<div className="space-y-2">
									<div className="flex justify-center">
										<CurrencySelector
											selectedCurrency={selectedCurrency}
											onCurrencyChange={setSelectedCurrency}
											showRefresh={true}
											onRefresh={updateRates}
											isRefreshing={isLoadingRates}
										/>
									</div>
									{lastUpdate && (
										<p className="text-xs text-center text-muted-foreground">
											Live rates • Updated {lastUpdate.toLocaleTimeString()}
										</p>
									)}
								</div>

								{selectedCurrency === "INR" && (
									<div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/10 border border-secondary/20">
										<Zap className="h-5 w-5 text-secondary" />
										<p className="text-sm font-medium text-secondary">
											UPI payments available (PhonePe, Google Pay, Paytm, BHIM)
										</p>
									</div>
								)}

								{/* Exchange Rate Indicator */}
								{selectedCurrency !== "USD" && currencies.length > 0 && (
									<div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
										<DollarSign className="h-4 w-4 text-primary" />
										<p className="text-sm text-muted-foreground">
											1 USD ={" "}
											{formatPrice(
												currencies.find((c) => c.code === selectedCurrency)
													?.rate || 1,
												selectedCurrency,
											)}
										</p>
									</div>
								)}

								{/* Credit Rate Display */}
								<div className="text-center py-8 px-6 rounded-2xl bg-muted/30 backdrop-blur-sm">
									<div className="flex items-baseline justify-center gap-3 mb-2">
										<span className="text-gradient text-7xl md:text-8xl font-bold">
											10
										</span>
										<span className="text-2xl text-muted-foreground">
											credits
										</span>
									</div>
									<div className="flex items-center justify-center gap-2 mb-4">
										<DollarSign className="h-8 w-8 text-secondary" />
										<span className="font-bold text-4xl">1</span>
									</div>
									<p className="text-muted-foreground">
										1 credit = 1 nanosecond of simulation
									</p>
								</div>

								{/* Benefits Grid */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{benefits.map((benefit, i) => (
										<div
											key={i}
											className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:bg-muted/30 ${benefit.highlight ? "bg-secondary/10 border border-secondary/20" : ""}`}
										>
											<div
												className={`flex h-10 w-10 items-center justify-center rounded-xl ${benefit.highlight ? "bg-gradient-secondary shadow-lg" : "bg-gradient-primary"} text-white`}
											>
												{benefit.icon}
											</div>
											<span
												className={
													benefit.highlight
														? "font-semibold text-secondary"
														: ""
												}
											>
												{benefit.text}
											</span>
										</div>
									))}
								</div>

								{/* Package selection */}
								<div className="space-y-4 pt-6 border-t border-border/40">
									<h3 className="text-center font-semibold text-xl">
										Choose Your Package
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										{creditOptions.map((option) => (
											<Card
												className={`relative cursor-pointer transition-all duration-300 hover:scale-105 ${
													selectedCredits === option.credits
														? "border-primary bg-primary/10 shadow-glow-sm"
														: "border-border/40 bg-background hover:border-primary/30"
												}`}
												key={option.credits}
												onClick={() => setSelectedCredits(option.credits)}
											>
												{option.popular && (
													<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-primary text-white text-xs font-medium shadow-lg">
														Most Popular
													</div>
												)}
												<CardContent className="p-5 text-center">
													<h4 className="font-bold text-lg mb-1">
														{option.label}
													</h4>
													<p className="text-muted-foreground text-sm mb-4">
														{option.description}
													</p>
													<div className="mb-2">
														<span className="text-gradient text-3xl font-bold">
															{option.credits.toLocaleString()}
														</span>
														<span className="text-muted-foreground text-sm ml-1">
															credits
														</span>
													</div>
													<div className="text-2xl font-bold">
														{formatPrice(
															convertPrice(
																option.credits / 10,
																selectedCurrency,
															),
															selectedCurrency,
														)}
													</div>
													{selectedCredits === option.credits && (
														<div className="absolute top-3 right-3">
															<Check className="h-5 w-5 text-primary" />
														</div>
													)}
												</CardContent>
											</Card>
										))}
									</div>
								</div>

								{/* Custom Amount Input */}
								<div className="space-y-4 pt-6 border-t border-border/40">
									<h3 className="text-center font-semibold">
										Or enter a custom amount
									</h3>
									<div className="flex gap-3 max-w-md mx-auto">
										<Input
											className="flex-1 h-12 text-center text-lg font-medium"
											min="1"
											onChange={(e) => {
												const value = Number.parseInt(e.target.value, 10) || 0;
												if (value >= 0) {
													setSelectedCredits(value);
												}
											}}
											placeholder="Enter credits"
											type="number"
											value={selectedCredits}
										/>
										<div className="flex items-center px-6 rounded-xl bg-muted/50 border border-border/40 font-bold text-xl">
											{formattedPrice}
										</div>
									</div>
								</div>

								{/* Action Button */}
								<Button
									className="w-full h-14 bg-gradient-primary shadow-glow text-lg font-semibold transition-all duration-300 hover:shadow-glow-lg hover:scale-[1.02]"
									disabled={isLoading || creditsNeeded <= 0}
									onClick={handleBuyCredits}
									size="lg"
								>
									{isLoading ? (
										<div className="flex items-center gap-2">
											<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
											Redirecting...
										</div>
									) : (
										<>
											Buy {creditsNeeded.toLocaleString()} credits for{" "}
											{formattedPrice}
											<ArrowRight className="ml-2 h-5 w-5" />
										</>
									)}
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* FAQ Section */}
			<section className="py-24 relative">
				<div className="absolute inset-0 mesh-gradient opacity-20" />
				<div className="container relative mx-auto px-4">
					<div className="mx-auto max-w-3xl">
						<div className="mb-16 text-center">
							<span className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
								FAQ
							</span>
							<h2 className="mb-4 font-bold text-4xl md:text-5xl">
								Frequently Asked{" "}
								<span className="text-gradient">Questions</span>
							</h2>
							<p className="text-muted-foreground text-xl">
								Everything you need to know about pricing and credits
							</p>
						</div>
						<Accordion className="space-y-4" collapsible type="single">
							{faqs.map((faq, index) => (
								<AccordionItem
									className="group rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm px-6 transition-all duration-300 hover:border-primary/30 hover:bg-card/80"
									key={index}
									value={`item-${index}`}
								>
									<AccordionTrigger className="text-left font-semibold py-5 hover:no-underline group-hover:text-primary transition-colors">
										{faq.question}
									</AccordionTrigger>
									<AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
										{faq.answer}
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-24 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse" />
				<div className="container relative mx-auto px-4 text-center">
					<div className="mx-auto max-w-3xl space-y-8">
						<h2 className="font-bold text-4xl md:text-5xl">
							Start Your Research Today
						</h2>
						<p className="text-muted-foreground text-xl">
							Get 5 free credits and run your first simulation
						</p>
						<Button
							className="h-14 px-12 bg-gradient-primary text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105"
							disabled={isLoading}
							onClick={handleBuyCredits}
							size="lg"
						>
							{isLoading
								? "Redirecting..."
								: `Buy ${creditsNeeded.toLocaleString()} credits (${formattedPrice})`}
						</Button>
					</div>
				</div>
			</section>
		</>
	);
};

function Pricing() {
	const { user } = useAuth();
	return (
		<div className="min-h-screen bg-background overflow-x-hidden">
			{convex ? (
				<PricingContentInner user={user} />
			) : (
				<div className="container mx-auto px-4 py-32 text-center">
					<Card className="max-w-md mx-auto p-12 bg-card/50 backdrop-blur-sm">
						<p className="text-muted-foreground">
							Backend connection is currently unavailable.
						</p>
					</Card>
				</div>
			)}
		</div>
	);
}
