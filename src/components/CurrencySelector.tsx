import { Globe, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface Currency {
	code: string;
	symbol: string;
	name: string;
	rate: number; // Exchange rate relative to USD
	minAmount: number; // Minimum amount in this currency
}

// Default fallback rates
const DEFAULT_CURRENCIES: Currency[] = [
	{ code: "USD", symbol: "$", name: "US Dollar", rate: 1, minAmount: 0.5 },
	{ code: "INR", symbol: "₹", name: "Indian Rupee", rate: 83, minAmount: 40 },
	{ code: "EUR", symbol: "€", name: "Euro", rate: 0.92, minAmount: 0.5 },
	{
		code: "GBP",
		symbol: "£",
		name: "British Pound",
		rate: 0.79,
		minAmount: 0.5,
	},
	{
		code: "CAD",
		symbol: "C$",
		name: "Canadian Dollar",
		rate: 1.35,
		minAmount: 0.5,
	},
	{
		code: "AUD",
		symbol: "A$",
		name: "Australian Dollar",
		rate: 1.52,
		minAmount: 0.5,
	},
	{ code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 149, minAmount: 50 },
	{
		code: "SGD",
		symbol: "S$",
		name: "Singapore Dollar",
		rate: 1.34,
		minAmount: 1,
	},
	{ code: "AED", symbol: "د.إ", name: "UAE Dirham", rate: 3.67, minAmount: 2 },
];

// Global state for exchange rates
let cachedRates: Currency[] = DEFAULT_CURRENCIES;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

interface ExchangeRateResponse {
	conversion_rates?: Record<string, number>;
	rates?: Record<string, number>;
}

// Fetch live exchange rates
async function fetchLiveRates(): Promise<Currency[]> {
	const now = Date.now();

	// Return cached rates if still valid
	if (
		now - lastFetchTime < CACHE_DURATION &&
		cachedRates !== DEFAULT_CURRENCIES
	) {
		return cachedRates;
	}

	try {
		// Using exchangerate-api.com (free tier, no API key needed)
		const response = await fetch(
			"https://api.exchangerate-api.com/v4/latest/USD",
		);

		if (!response.ok) {
			throw new Error("Failed to fetch exchange rates");
		}

		const data: ExchangeRateResponse = await response.json();
		const rates = data.conversion_rates || data.rates || {};

		// Update rates while keeping currency metadata
		cachedRates = DEFAULT_CURRENCIES.map((currency) => ({
			...currency,
			rate: rates[currency.code] || currency.rate,
		}));

		lastFetchTime = now;
		console.log(
			"Live exchange rates updated:",
			new Date().toLocaleTimeString(),
		);

		return cachedRates;
	} catch (error) {
		console.error(
			"Failed to fetch live exchange rates, using fallback:",
			error,
		);
		return DEFAULT_CURRENCIES;
	}
}

export let SUPPORTED_CURRENCIES: Currency[] = DEFAULT_CURRENCIES;

// Hook to use live currency rates
export function useLiveCurrencyRates() {
	const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
	const [isLoading, setIsLoading] = useState(false);
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

	useEffect(() => {
		// Only run in browser
		if (typeof window === "undefined") return;

		const updateRates = async () => {
			setIsLoading(true);
			try {
				const rates = await fetchLiveRates();
				setCurrencies(rates);
				SUPPORTED_CURRENCIES = rates;
				setLastUpdate(new Date());
			} catch (error) {
				console.error("Error updating rates:", error);
			} finally {
				setIsLoading(false);
			}
		};

		// Fetch rates on mount
		updateRates();

		// Set up periodic updates every hour
		const interval = setInterval(updateRates, CACHE_DURATION);

		return () => clearInterval(interval);
	}, []); // Empty deps - only run once on mount

	return {
		currencies, isLoading, lastUpdate, updateRates: async () => {
			if (typeof window === "undefined") return;
			setIsLoading(true);
			try {
				const rates = await fetchLiveRates();
				setCurrencies(rates);
				SUPPORTED_CURRENCIES = rates;
				setLastUpdate(new Date());
			} catch (error) {
				console.error("Error updating rates:", error);
			} finally {
				setIsLoading(false);
			}
		}
	};
}

interface CurrencySelectorProps {
	selectedCurrency: string;
	onCurrencyChange: (currency: string) => void;
	showRefresh?: boolean;
	onRefresh?: () => void;
	isRefreshing?: boolean;
}

export function CurrencySelector({
	selectedCurrency,
	onCurrencyChange,
	showRefresh = false,
	onRefresh,
	isRefreshing = false,
}: CurrencySelectorProps) {
	const currentCurrency = SUPPORTED_CURRENCIES.find(
		(c) => c.code === selectedCurrency,
	);

	return (
		<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 border border-border/40">
			<Globe className="h-4 w-4 text-muted-foreground" />
			<Select value={selectedCurrency} onValueChange={onCurrencyChange}>
				<SelectTrigger className="w-[180px] border-0 bg-transparent focus:ring-0">
					<SelectValue>
						{currentCurrency?.symbol} {currentCurrency?.code} -{" "}
						{currentCurrency?.name}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{SUPPORTED_CURRENCIES.map((currency) => (
						<SelectItem key={currency.code} value={currency.code}>
							<div className="flex items-center gap-2">
								<span className="font-medium">{currency.symbol}</span>
								<span>{currency.code}</span>
								<span className="text-muted-foreground">- {currency.name}</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{showRefresh && onRefresh && (
				<button
					type="button"
					onClick={onRefresh}
					disabled={isRefreshing}
					className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
					title="Refresh exchange rates"
				>
					<RefreshCw
						className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
					/>
				</button>
			)}
		</div>
	);
}

export function convertPrice(
	amountInUSD: number,
	targetCurrency: string,
): number {
	const currency = SUPPORTED_CURRENCIES.find((c) => c.code === targetCurrency);
	if (!currency) return amountInUSD;
	return amountInUSD * currency.rate;
}

export function formatPrice(amount: number, currencyCode: string): string {
	const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
	if (!currency) return `$${amount.toFixed(2)}`;

	// Format based on currency
	if (currencyCode === "JPY") {
		return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
	}
	return `${currency.symbol}${amount.toFixed(2)}`;
}

export function detectUserCurrency(): string {
	// SSR safety check
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return "USD";
	}

	// Try to detect user's country from browser
	const locale = navigator.language;
	const countryCode = locale.split("-")[1]?.toUpperCase();

	const countryToCurrency: Record<string, string> = {
		IN: "INR",
		GB: "GBP",
		CA: "CAD",
		AU: "AUD",
		JP: "JPY",
		SG: "SGD",
		AE: "AED",
		DE: "EUR",
		FR: "EUR",
		IT: "EUR",
		ES: "EUR",
		NL: "EUR",
	};

	return countryToCurrency[countryCode || ""] || "USD";
}
