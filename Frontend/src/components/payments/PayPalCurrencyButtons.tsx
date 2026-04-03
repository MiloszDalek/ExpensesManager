import {
  PayPalButtons,
  PayPalScriptProvider,
  type PayPalButtonsComponentProps,
} from "@paypal/react-paypal-js";

type PayPalCurrencyButtonsProps = PayPalButtonsComponentProps & {
  currency: string;
};

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

export function PayPalCurrencyButtons({ currency, ...buttonsProps }: PayPalCurrencyButtonsProps) {
  if (!paypalClientId) {
    return null;
  }

  const normalizedCurrency = currency.toUpperCase();
  const namespace = `paypal_sdk_${normalizedCurrency.toLowerCase()}`;

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        intent: "capture",
        currency: normalizedCurrency,
        dataNamespace: namespace,
      }}
    >
      <PayPalButtons {...buttonsProps} />
    </PayPalScriptProvider>
  );
}
