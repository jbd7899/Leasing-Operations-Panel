/** Fields that contribute to profile completeness, with friendly labels for the AI prompt. */
const SCORED_FIELDS: Array<{ key: string; label: string }> = [
  { key: "firstName", label: "first name" },
  { key: "lastName", label: "last name" },
  { key: "email", label: "email address" },
  { key: "desiredBedrooms", label: "desired bedrooms" },
  { key: "desiredMoveInDate", label: "move-in date" },
  { key: "budget", label: "budget" }, // budgetMin OR budgetMax
  { key: "pets", label: "pets" },
  { key: "voucherType", label: "voucher / housing program" },
  { key: "employmentStatus", label: "employment status" },
  { key: "monthlyIncome", label: "monthly income" },
  { key: "languagePreference", label: "language preference" },
];

type ProspectFields = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  desiredBedrooms?: string | null;
  desiredMoveInDate?: string | null;
  budgetMin?: string | number | null;
  budgetMax?: string | number | null;
  pets?: string | null;
  voucherType?: string | null;
  employmentStatus?: string | null;
  monthlyIncome?: string | number | null;
  languagePreference?: string | null;
};

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

export function computeCompletenessScore(prospect: ProspectFields): number {
  let filled = 0;
  for (const field of SCORED_FIELDS) {
    if (field.key === "budget") {
      if (isPresent(prospect.budgetMin) || isPresent(prospect.budgetMax)) filled++;
    } else {
      if (isPresent((prospect as Record<string, unknown>)[field.key])) filled++;
    }
  }
  return Math.round((filled / SCORED_FIELDS.length) * 100);
}

export function getMissingFields(prospect: ProspectFields): string[] {
  const missing: string[] = [];
  for (const field of SCORED_FIELDS) {
    if (field.key === "budget") {
      if (!isPresent(prospect.budgetMin) && !isPresent(prospect.budgetMax)) {
        missing.push(field.label);
      }
    } else {
      if (!isPresent((prospect as Record<string, unknown>)[field.key])) {
        missing.push(field.label);
      }
    }
  }
  return missing;
}
