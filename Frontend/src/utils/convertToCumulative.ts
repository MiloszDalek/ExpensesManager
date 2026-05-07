export function convertToCumulative(
  data: { date: string; amount: number; currency: string }[]
): { date: string; value: number; currency: string }[] {
  let sum = 0;
  return data.map((item) => {
    sum += item.amount;
    return {
      date: item.date,
      value: sum,
      currency: item.currency,
    };
  });
}
