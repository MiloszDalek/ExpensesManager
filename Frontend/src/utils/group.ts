export const formatGroupName = (name: string | null | undefined): string => {
  if (!name) {
    return "";
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }

  const [first, ...rest] = trimmed;
  return first.toLocaleUpperCase() + rest.join("");
};
