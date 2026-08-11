function getBooleanEnvironmentVariable(name, defaultValue) {
    const rawValue = process.env[name];
    if (rawValue === undefined) {
        return defaultValue;
    }
    const value = rawValue.trim().toLowerCase();
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }
    throw new Error(`${name} must be either "true" or "false"`);
}
const gstEnabled = getBooleanEnvironmentVariable("GST_ENABLED", false);
const supplierStateCode = process.env.GST_SUPPLIER_STATE_CODE?.trim();
if (gstEnabled && !supplierStateCode) {
    throw new Error("GST_SUPPLIER_STATE_CODE is required when GST is enabled");
}
if (supplierStateCode && !/^\d{2}$/.test(supplierStateCode)) {
    throw new Error("GST_SUPPLIER_STATE_CODE must contain exactly two digits");
}
const gstin = process.env.GSTIN?.trim();
if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) {
    throw new Error("GSTIN must contain exactly 15 uppercase alphanumeric characters");
}
const currency = process.env.DEFAULT_CURRENCY?.trim().toUpperCase() || "INR";
if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("DEFAULT_CURRENCY must be a three-letter currency code");
}
export const taxConfig = {
    enabled: gstEnabled,
    supplierStateCode: supplierStateCode ?? "",
    currency,
    ...(gstin !== undefined ? { gstin } : {}),
};
//# sourceMappingURL=tax.config.js.map