"use client";
import { useEffect } from "react";
import { initSecurity } from "@/lib/security";
export default function SecurityInit() {
	useEffect(() => {
		initSecurity();
	}, []);
	return null;
}
