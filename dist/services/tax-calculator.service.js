export class TaxCalculatorService {
    static round(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }
    static validateAmount(fieldName, value) {
        if (typeof value !== "number" ||
            !Number.isFinite(value) ||
            value < 0) {
            throw new Error(`${fieldName} must be a valid non-negative number`);
        }
    }
    static resolveJurisdiction(supplierStateCode, placeOfSupplyStateCode) {
        const supplierCode = supplierStateCode.trim();
        const placeOfSupplyCode = placeOfSupplyStateCode.trim();
        if (!/^\d{2}$/.test(supplierCode)) {
            throw new Error("Supplier state code must contain exactly two digits");
        }
        if (!/^\d{2}$/.test(placeOfSupplyCode)) {
            throw new Error("Place of supply state code must contain exactly two digits");
        }
        return supplierCode === placeOfSupplyCode
            ? "INTRA_STATE"
            : "INTER_STATE";
    }
    static calculateLineTax(input) {
        const { amount, profile, supplierStateCode, placeOfSupplyStateCode, } = input;
        const discountAmount = input.discountAmount ?? 0;
        this.validateAmount("amount", amount);
        this.validateAmount("discountAmount", discountAmount);
        if (discountAmount > amount) {
            throw new Error("discountAmount cannot be greater than amount");
        }
        const netAmount = this.round(amount - discountAmount);
        const jurisdiction = this.resolveJurisdiction(supplierStateCode, placeOfSupplyStateCode);
        /*
         * EXEMPT, NIL_RATED and NON_GST lines
         * do not produce GST.
         */
        if (profile.treatment !== "TAXABLE") {
            return {
                profile,
                jurisdiction,
                taxableAmount: 0,
                cgstRate: 0,
                cgstAmount: 0,
                sgstRate: 0,
                sgstAmount: 0,
                igstRate: 0,
                igstAmount: 0,
                totalTax: 0,
                finalAmount: netAmount,
            };
        }
        this.validateAmount("profile.totalRate", profile.totalRate);
        if (profile.totalRate <= 0) {
            throw new Error("Taxable profile must have a tax rate greater than zero");
        }
        const totalApplicableRate = profile.totalRate;
        let rawTaxableAmount;
        if (profile.priceMode === "INCLUSIVE") {
            rawTaxableAmount =
                totalApplicableRate > 0
                    ? netAmount /
                        (1 + totalApplicableRate / 100)
                    : netAmount;
        }
        else {
            rawTaxableAmount = netAmount;
        }
        const rawGstAmount = rawTaxableAmount *
            (profile.totalRate / 100);
        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;
        if (jurisdiction === "INTRA_STATE") {
            cgstRate = profile.totalRate / 2;
            sgstRate = profile.totalRate / 2;
            const roundedGstAmount = this.round(rawGstAmount);
            cgstAmount = this.round(roundedGstAmount / 2);
            /*
             * Subtract CGST from total GST to avoid
             * one-paisa rounding differences.
             */
            sgstAmount = this.round(roundedGstAmount - cgstAmount);
        }
        else {
            igstRate = profile.totalRate;
            igstAmount = this.round(rawGstAmount);
        }
        const totalTax = this.round(cgstAmount +
            sgstAmount +
            igstAmount);
        let taxableAmount;
        let finalAmount;
        if (profile.priceMode === "INCLUSIVE") {
            /*
             * Tax is already included in netAmount.
             */
            taxableAmount = this.round(netAmount - totalTax);
            finalAmount = netAmount;
        }
        else {
            taxableAmount =
                this.round(rawTaxableAmount);
            finalAmount = this.round(taxableAmount + totalTax);
        }
        return {
            profile,
            jurisdiction,
            taxableAmount,
            cgstRate: this.round(cgstRate),
            cgstAmount,
            sgstRate: this.round(sgstRate),
            sgstAmount,
            igstRate: this.round(igstRate),
            igstAmount,
            totalTax,
            finalAmount,
        };
    }
}
//# sourceMappingURL=tax-calculator.service.js.map