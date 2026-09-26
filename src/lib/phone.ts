/** Uzbek numbers are a 2-digit operator code plus 7 subscriber digits. */
export const UZ_NATIONAL_LENGTH = 9;
const UZ_COUNTRY_CODE = "998";

/** Strips everything that isn't a digit, and the +998 prefix if it was typed. */
export function digitsOf(input: string): string {
  const digits = input.replace(/\D/g, "");
  const withoutCountry = digits.startsWith(UZ_COUNTRY_CODE) ? digits.slice(UZ_COUNTRY_CODE.length) : digits;
  return withoutCountry.slice(0, UZ_NATIONAL_LENGTH);
}

/** "901234567" -> "90 123 45 67", formatting only as far as the user has typed. */
export function formatNational(digits: string): string {
  const d = digitsOf(digits);
  const groups = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return groups.join(" ");
}

export function isValidUzPhone(input: string): boolean {
  return digitsOf(input).length === UZ_NATIONAL_LENGTH;
}

/**
 * Wire format for the API (+998901234567), or the spaced display form used in
 * the "we sent a code to ..." line.
 */
export function toE164(input: string, options?: { pretty?: boolean }): string {
  const d = digitsOf(input);
  if (options?.pretty) return `+${UZ_COUNTRY_CODE} ${formatNational(d)}`.trimEnd();
  return `+${UZ_COUNTRY_CODE}${d}`;
}
