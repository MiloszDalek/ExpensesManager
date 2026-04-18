import { useState } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
  type PayPalButtonsComponentProps,
} from "@paypal/react-paypal-js";

import { paypalConfig } from "@/config/paypal";

type PayPalCurrencyButtonsProps = PayPalButtonsComponentProps & {
  currency: string;
};

export function PayPalCurrencyButtons({ currency, ...buttonsProps }: PayPalCurrencyButtonsProps) {
  const [isSubmittingMock, setIsSubmittingMock] = useState(false);

  if (paypalConfig.isDisabled) {
    return null;
  }

  if (paypalConfig.isMock) {
    const handleMockApprove = async () => {
      if (buttonsProps.disabled || isSubmittingMock) {
        return;
      }

      setIsSubmittingMock(true);
      try {
        const orderId = await buttonsProps.createOrder?.({} as never, {} as never);
        if (!orderId) {
          throw new Error("Could not create PayPal order");
        }

        await buttonsProps.onApprove?.({ orderID: orderId } as never, {} as never);
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error("PayPal mock checkout failed");
        buttonsProps.onError?.({ message: normalizedError.message });
      } finally {
        setIsSubmittingMock(false);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-[34px] min-w-[118px] rounded-full bg-[#ffc439] px-4 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#ffb300] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleMockApprove}
          disabled={Boolean(buttonsProps.disabled) || isSubmittingMock}
        >
          {isSubmittingMock ? "PayPal..." : "PayPal"}
        </button>
        <span className="rounded-full border border-amber-600/60 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
          Mock
        </span>
      </div>
    );
  }

  if (!paypalConfig.clientId) {
    return null;
  }

  const normalizedCurrency = currency.toUpperCase();
  const namespace = `paypal_sdk_${normalizedCurrency.toLowerCase()}`;

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalConfig.clientId,
        intent: "capture",
        currency: normalizedCurrency,
        dataNamespace: namespace,
      }}
    >
      <PayPalButtons {...buttonsProps} />
    </PayPalScriptProvider>
  );
}
