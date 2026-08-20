export interface CalculatorIdentityName {
  firstName: string;
  middleName: string;
  lastName: string;
}

export type BirthDateError = 'invalid' | 'future' | 'underage' | null;

export function joinCalculatorFullName({
  firstName,
  middleName,
  lastName,
}: CalculatorIdentityName): string {
  return [firstName, middleName, lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

export function splitCalculatorFullName(
  fullName: string
): Pick<CalculatorIdentityName, 'firstName' | 'lastName'> | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  const lastName = parts.pop();
  if (!lastName) return null;

  return {
    firstName: parts.join(' '),
    lastName,
  };
}

export function validateCalculatorBirthDate(
  value: string,
  now: Date = new Date()
): BirthDateError {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return 'invalid';

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return 'invalid';
  }

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  if (birthDate > today) return 'future';

  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayHasPassed) age -= 1;

  return age >= 18 ? null : 'underage';
}
