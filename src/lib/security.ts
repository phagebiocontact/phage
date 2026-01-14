const SECURITY_CONFIG = {
	enforceHTTPS: import.meta.env.PROD,
	requestTimeout: 30000,
	maxRetries: 3,
};
function validateSecureConnection(): void {
	if (
		typeof window !== "undefined" &&
		SECURITY_CONFIG.enforceHTTPS &&
		window.location.protocol !== "https:"
	) {
		console.error("⚠️ Insecure connection detected. Redirecting to HTTPS...");
		window.location.href = window.location.href.replace("http:", "https:");
	}
}
function generateRequestId(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 15);
	return `${timestamp}-${random}`;
}
function getSecureHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"X-Requested-With": "XMLHttpRequest",
		"X-Request-ID": generateRequestId(),
	};
	const csrfToken = getCSRFToken();
	if (csrfToken) {
		headers["X-CSRF-Token"] = csrfToken;
	}
	return headers;
}
function getCSRFToken(): string | null {
	if (typeof document === "undefined") return null;
	const metaTag = document.querySelector('meta[name="csrf-token"]');
	if (metaTag) {
		return metaTag.getAttribute("content");
	}
	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (name === "XSRF-TOKEN") {
			return decodeURIComponent(value);
		}
	}
	return null;
}
function _sanitizeInput(input: string): string {
	if (typeof document === "undefined") return input;
	const div = document.createElement("div");
	div.textContent = input;
	return div.innerHTML;
}
function _isValidRedirectUrl(url: string): boolean {
	if (typeof window === "undefined") return true;
	try {
		const urlObj = new URL(url, window.location.origin);
		return urlObj.origin === window.location.origin;
	} catch {
		return false;
	}
}
const _secureStorage = {
	setItem(key: string, value: string): void {
		if (typeof window === "undefined") return;
		try {
			const encoded = btoa(encodeURIComponent(value));
			localStorage.setItem(key, encoded);
		} catch (error) {
			console.error("Failed to store item securely:", error);
		}
	},
	getItem(key: string): string | null {
		if (typeof window === "undefined") return null;
		try {
			const encoded = localStorage.getItem(key);
			if (!encoded) return null;
			return decodeURIComponent(atob(encoded));
		} catch (error) {
			console.error("Failed to retrieve item securely:", error);
			return null;
		}
	},
	removeItem(key: string): void {
		if (typeof window === "undefined") return;
		localStorage.removeItem(key);
	},
	clear(): void {
		if (typeof window === "undefined") return;
		localStorage.clear();
	},
};
function initSecurityMonitoring(): void {
	if (typeof window === "undefined") return;
	validateSecureConnection();
	if (window.location.protocol === "https:") {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const resource = entry as PerformanceResourceTiming;
				if (resource.name.startsWith("http:")) {
					console.warn("⚠️ Insecure resource loaded over HTTPS:", resource.name);
				}
			}
		});
		observer.observe({ entryTypes: ["resource"] });
	}
	window.addEventListener("error", (event) => {
		if (event.message.includes("script")) {
			console.warn("⚠️ Potential XSS attempt detected:", event);
		}
	});
	if (window.self !== window.top) {
		console.warn("⚠️ Page loaded in iframe - potential clickjacking attempt");
	}
}
async function _secureFetch(
	url: string,
	options: RequestInit = {},
): Promise<Response> {
	if (SECURITY_CONFIG.enforceHTTPS && !url.startsWith("https://")) {
		throw new Error("Insecure URL: HTTPS required in production");
	}
	const headers = {
		...getSecureHeaders(),
		...options.headers,
	};
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		SECURITY_CONFIG.requestTimeout,
	);
	try {
		const response = await fetch(url, {
			...options,
			headers,
			signal: controller.signal,
			credentials: "include",
		});
		clearTimeout(timeoutId);
		if (response.status === 403) {
			throw new Error("Access forbidden - possible CSRF token mismatch");
		}
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("Request timeout");
		}
		throw error;
	}
}
export function initSecurity(): void {
	if (typeof document === "undefined") return;
	initSecurityMonitoring();
}
