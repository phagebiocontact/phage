"use client";
import { Link, type LinkProps } from "@tanstack/react-router";

interface NavLinkProps extends Omit<LinkProps, "to"> {
	href: string;
	activeClassName?: string;
	className?: string;
}

export function NavLink({
	className,
	activeClassName,
	href,
	...props
}: NavLinkProps) {
	return (
		<Link
			to={href}
			className={className}
			activeProps={{
				className: activeClassName,
			}}
			{...props}
		/>
	);
}
