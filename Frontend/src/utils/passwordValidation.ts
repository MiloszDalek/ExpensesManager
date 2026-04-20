export const PASSWORD_MIN_LENGTH = 8;

export type PasswordValidationResult = {
  minLength: boolean;
  hasLetter: boolean;
  hasDigit: boolean;
};

export const validatePassword = (password: string): PasswordValidationResult => {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasLetter: /[A-Za-z]/.test(password),
    hasDigit: /\d/.test(password),
  };
};

export const isPasswordValid = (password: string): boolean => {
  const result = validatePassword(password);
  return result.minLength && result.hasLetter && result.hasDigit;
};