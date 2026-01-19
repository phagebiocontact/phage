# UPI Payments & Adaptive Currency Integration

## Overview
Successfully integrated UPI payment methods and adaptive currency support using Dodo Payments API.

## Features Implemented

### 1. **UPI Payment Support**
- **Payment Methods**: `upi_collect`, `upi_intent`
- **Automatic Detection**: UPI options are automatically enabled for Indian customers (country code: IN)
- **Supported Apps**: PhonePe, Google Pay, Paytm, BHIM, CRED
- **Visual Indicator**: Special badge shown on pricing page when INR is selected

### 2. **Live Currency Conversion** ⚡ NEW
- **Real-Time Rates**: Fetches live exchange rates from exchangerate-api.com
- **Auto-Refresh**: Updates rates every hour automatically
- **Manual Refresh**: Refresh button to get latest rates on demand
- **Rate Display**: Shows current exchange rate (e.g., "1 USD = ₹83.45")
- **Last Update Timestamp**: Displays when rates were last updated
- **Caching**: 1-hour cache to minimize API calls
- **Fallback**: Uses default rates if API is unavailable

### 3. **Adaptive Currency**
- **Auto-Detection**: Automatically detects user's currency based on browser locale
- **Supported Currencies**:
  - USD (US Dollar) - $
  - INR (Indian Rupee) - ₹
  - EUR (Euro) - €
  - GBP (British Pound) - £
  - CAD (Canadian Dollar) - C$
  - AUD (Australian Dollar) - A$
  - JPY (Japanese Yen) - ¥
  - SGD (Singapore Dollar) - S$
  - AED (UAE Dirham) - د.إ

### 4. **Currency Selector Component**
- **Location**: `src/components/CurrencySelector.tsx`
- **Features**:
  - Dropdown selector with all supported currencies
  - Real-time price conversion
  - Proper formatting for each currency
  - Minimum amount validation per currency
  - Refresh button for manual rate updates
  - Loading indicator during rate fetch

### 5. **Backend Updates**
- **File**: `convex/payments.ts`
- **Changes**:
  - Added `country` parameter to checkout session
  - Automatic currency detection based on country
  - Automatic payment method selection (UPI for India)
  - Currency mapping for major countries

### 6. **Frontend Updates**
- **File**: `src/routes/pricing.tsx`
- **Changes**:
  - Integrated currency selector with live rates
  - Dynamic price display in selected currency
  - UPI availability indicator for INR
  - Exchange rate display for non-USD currencies
  - Last update timestamp
  - Pass currency and country to checkout API

## How It Works

### Live Currency Conversion Flow
1. **Initial Load**:
   - Component mounts and calls `useLiveCurrencyRates()` hook
   - Fetches live rates from exchangerate-api.com
   - Updates all prices with real-time conversion

2. **Automatic Updates**:
   - Rates refresh every hour automatically
   - Background updates don't interrupt user experience
   - Cache prevents excessive API calls

3. **Manual Refresh**:
   - User clicks refresh button
   - Fetches latest rates immediately
   - Shows loading spinner during fetch
   - Updates timestamp on completion

4. **Rate Display**:
   - Shows "1 USD = [amount in selected currency]"
   - Only visible when non-USD currency selected
   - Uses live rates for accurate conversion

### Currency Detection Flow
1. User visits pricing page
2. System detects browser locale (e.g., `en-IN`)
3. Extracts country code (`IN`)
4. Maps to appropriate currency (`INR`)
5. Displays prices in detected currency

### Payment Method Selection
1. User selects currency (or auto-detected)
2. System maps currency to country code
3. If country is India (`IN`):
   - Adds UPI payment methods: `upi_collect`, `upi_intent`
   - Shows UPI availability badge
4. Creates checkout session with appropriate payment methods

### Checkout Process
1. User clicks "Buy Credits"
2. System sends to Dodo Payments:
   - `credits`: Number of credits to purchase
   - `currency`: Selected currency code (e.g., "INR")
   - `country`: Detected country code (e.g., "IN")
3. Dodo Payments creates checkout with:
   - Localized currency
   - Regional payment methods (UPI for India)
   - Real-time FX conversion

## Testing

### Test UPI IDs (Test Mode Only)
- **Success**: `success@upi`
- **Failure**: `failure@upi`

### Test Currencies
All currencies can be tested in test mode. The system will:
- Convert prices using real-time exchange rates
- Display minimum amounts per currency
- Validate transaction amounts

## Configuration

### Environment Variables Required
- `DODO_PAYMENTS_API_KEY`: Your Dodo Payments API key
- `DODO_PAYMENTS_PRODUCT_ID`: Product ID for credits
- `DODO_PAYMENTS_RETURN_URL`: Return URL after payment
- `DODO_PAYMENTS_ENVIRONMENT`: `test_mode` or `live_mode`

### Enable Adaptive Currency in Dodo Dashboard
1. Go to Business Settings
2. Enable "Adaptive Currency"
3. Configure supported currencies

## Benefits

### For Users
- **Familiar Payment Methods**: UPI for Indian users
- **Local Currency**: Prices in their preferred currency
- **Transparent Pricing**: No hidden FX fees
- **Better Conversion**: Localized pricing improves trust

### For Business
- **Higher Conversion**: Localized experience reduces friction
- **Global Reach**: Support for 9 major currencies
- **Automatic FX**: Real-time exchange rate handling
- **Regional Methods**: UPI, cards, wallets based on location

## Future Enhancements
- Add more regional payment methods (iDEAL, Bancontact, etc.)
- Expand currency support to 50+ currencies
- Add currency preference saving to user profile
- Implement geo-IP detection for better accuracy
