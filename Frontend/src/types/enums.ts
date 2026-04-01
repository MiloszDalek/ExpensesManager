export const SUPPORTED_CURRENCIES = [
	"AED",
	"AUD",
	"CAD",
	"CHF",
	"CNY",
	"CZK",
	"DKK",
	"PLN",
	"EUR",
	"GBP",
	"HKD",
	"HUF",
	"ILS",
	"JPY",
	"NOK",
	"NZD",
	"RON",
	"SEK",
	"SGD",
	"TRY",
	"USD",
	"ZAR",
] as const;

export type CurrencyEnum = (typeof SUPPORTED_CURRENCIES)[number];
export type SplitType = "equal" | "percent" | "exact";

export type GroupStatus = "active" | "archived";
export type GroupMemberRole = "admin" | "member";
export type GroupMemberStatus = "active" | "left";

export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled" | "archived";
export type InvitationType = "contact" | "group";

export type NotificationType = "invitation";

export type PaymentMethod = "cash";
export type SettlementStatus = "pending" | "completed" | "failed";

