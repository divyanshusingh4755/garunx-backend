function getBooleanEnvironmentVariable(
  name: string,
  defaultValue: boolean,
): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

const gstEnabled =
  getBooleanEnvironmentVariable(
    "GST_ENABLED",
    false,
  );

const supplierStateCode =
  process.env.GST_SUPPLIER_STATE_CODE?.trim();

if (
  gstEnabled &&
  !supplierStateCode
) {
  throw new Error(
    "GST_SUPPLIER_STATE_CODE is required when GST is enabled",
  );
}

if (
  supplierStateCode &&
  !/^\d{2}$/.test(supplierStateCode)
) {
  throw new Error(
    "GST_SUPPLIER_STATE_CODE must contain exactly two digits",
  );
}

export const taxConfig = {
  enabled: gstEnabled,

  supplierStateCode:
    supplierStateCode || "",

  gstin:
    process.env.GSTIN?.trim() || undefined,

  currency:
    process.env.DEFAULT_CURRENCY?.trim() ||
    "INR",
};