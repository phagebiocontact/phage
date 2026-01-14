"use client";
import { Dna, Github, Linkedin, Mail, Twitter } from "lucide-react";
import { motion } from "motion/react";
import { NavLink } from "@/components/NavLink";

const footerLinks = {
	platform: [
		{ href: "/simulate", label: "Simulate" },
		{ href: "/jobs", label: "My Jobs" },
		{ href: "/pricing", label: "Pricing" },
		{ href: "/features", label: "Features" },
	],
	company: [
		{ href: "/features", label: "About" },
		{ href: "/contact", label: "Contact" },
		{ href: "/privacy", label: "Privacy" },
		{ href: "/terms", label: "Terms" },
	],
	socials: [
		{
			href: "https://twitter.com",
			icon: <Twitter className="h-5 w-5" />,
			label: "Twitter",
		},
		{
			href: "https://github.com",
			icon: <Github className="h-5 w-5" />,
			label: "GitHub",
		},
		{
			href: "https://linkedin.com",
			icon: <Linkedin className="h-5 w-5" />,
			label: "LinkedIn",
		},
		{
			href: "mailto:support@phage.bio",
			icon: <Mail className="h-5 w-5" />,
			label: "Email",
		},
	],
};

const container = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.3,
		},
	},
};

const item = {
	hidden: { opacity: 0, y: 20 },
	show: { opacity: 1, y: 0 },
};

const Footer = () => {
	return (
		<footer className="relative border-t border-border/40 overflow-hidden">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-background" />
			<motion.div
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.3, 0.5, 0.3],
				}}
				transition={{
					duration: 10,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
				className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
			/>
			<motion.div
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.3, 0.5, 0.3],
				}}
				transition={{
					duration: 12,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
					delay: 1,
				}}
				className="absolute bottom-0 right-1/4 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"
			/>

			<div className="container relative mx-auto px-4 py-16 lg:py-20">
				<motion.div
					variants={container}
					initial="hidden"
					whileInView="show"
					viewport={{ once: true }}
					className="grid gap-12 lg:grid-cols-12"
				>
					{/* Brand Column */}
					<motion.div variants={item} className="lg:col-span-4 space-y-6">
						<NavLink href="/" className="inline-flex items-center gap-3 group">
							<motion.div
								whileHover={{ rotate: 360 }}
								transition={{ duration: 0.7 }}
								className="relative w-12 h-12 rounded-xl bg-gradient-primary p-2 shadow-lg"
							>
								<Dna className="w-full h-full text-white" />
							</motion.div>
							<span className="text-gradient font-bold text-2xl">Phage</span>
						</NavLink>
						<p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
							Accelerating molecular discovery through advanced cloud-based
							simulations and AI-powered analysis.
						</p>
						{/* Social Links */}
						<div className="flex gap-3 pt-2">
							{footerLinks.socials.map((social) => (
								<motion.a
									key={social.label}
									href={social.href}
									target="_blank"
									rel="noreferrer"
									whileHover={{ scale: 1.1, y: -3 }}
									whileTap={{ scale: 0.95 }}
									className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground transition-colors hover:bg-primary hover:text-white hover:shadow-glow-sm"
									aria-label={social.label}
								>
									{social.icon}
								</motion.a>
							))}
						</div>
					</motion.div>

					{/* Links Columns */}
					<div className="lg:col-span-8">
						<div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
							{/* Platform Links */}
							<motion.div variants={item}>
								<h3 className="font-semibold text-lg mb-5">Platform</h3>
								<ul className="space-y-3">
									{footerLinks.platform.map((link) => (
										<li key={link.href}>
											<NavLink
												href={link.href}
												className="text-muted-foreground transition-all duration-300 hover:text-foreground hover:translate-x-1 inline-block"
											>
												{link.label}
											</NavLink>
										</li>
									))}
								</ul>
							</motion.div>

							{/* Company Links */}
							<motion.div variants={item}>
								<h3 className="font-semibold text-lg mb-5">Company</h3>
								<ul className="space-y-3">
									{footerLinks.company.map((link) => (
										<li key={link.href}>
											<NavLink
												href={link.href}
												className="text-muted-foreground transition-all duration-300 hover:text-foreground hover:translate-x-1 inline-block"
											>
												{link.label}
											</NavLink>
										</li>
									))}
								</ul>
							</motion.div>

							{/* Newsletter */}
							<motion.div variants={item} className="col-span-2 sm:col-span-1">
								<h3 className="font-semibold text-lg mb-5">Stay Updated</h3>
								<p className="text-muted-foreground text-sm mb-4">
									Get the latest updates on features and releases.
								</p>
								<div className="flex flex-col sm:flex-row gap-2 w-full">
									<input
										type="email"
										placeholder="Enter email"
										className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
									/>
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										className="px-4 py-2.5 rounded-lg bg-gradient-primary text-white text-sm font-medium hover:shadow-glow-sm whitespace-nowrap min-w-fit"
									>
										Subscribe
									</motion.button>
								</div>
							</motion.div>
						</div>
					</div>
				</motion.div>

				{/* Bottom Bar */}
				<motion.div
					variants={item}
					initial="hidden"
					whileInView="show"
					viewport={{ once: true }}
					className="mt-16 pt-8 border-t border-border/40"
				>
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<p className="text-muted-foreground text-sm">
							© {new Date().getFullYear()} Phage. All rights reserved.
						</p>
						<div className="flex items-center gap-6 text-muted-foreground text-sm">
							<NavLink
								href="/privacy"
								className="hover:text-foreground transition-colors"
							>
								Privacy Policy
							</NavLink>
							<NavLink
								href="/terms"
								className="hover:text-foreground transition-colors"
							>
								Terms of Service
							</NavLink>
						</div>
					</div>
				</motion.div>
			</div>
		</footer>
	);
};

export default Footer;
