// Identity collection is deliberately unavailable until the operator's handling
// policy and restricted storage/review/deletion workflow are implemented.
export const IDENTITY_FIELDS = ["staff_id", "identity_type", "identity_number", "national_id", "passport_number"] as const;

export function getIdentityCollectionError(formData: FormData): string | null {
  return IDENTITY_FIELDS.some((field) => formData.getAll(field).some((value) => String(value).trim()))
    ? "Identity collection is not enabled. Do not submit staff, national ID or passport details."
    : null;
}
