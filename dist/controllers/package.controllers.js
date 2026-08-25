import { PackageService } from "../services/package.service.js";
import { PackageDiagnosticsEngine } from "../services/package-diagnostics-engine.service.js";
const parsePositiveInteger = (value, defaultValue, maximum) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return defaultValue;
    }
    return maximum ? Math.min(parsed, maximum) : parsed;
};
const parseIdList = (value) => {
    if (typeof value !== "string") {
        return undefined;
    }
    const ids = value.split(",").map((id) => id.trim()).filter(Boolean);
    return ids.length ? ids : undefined;
};
export const createPackage = async (req, res) => {
    try {
        const pkg = await PackageService.createPackage(req.body);
        return res.status(201).json({
            success: true,
            data: pkg,
        });
    }
    catch (error) {
        if (error.name === "ValidationError" || error.isOperational) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Package with this reference already exists",
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};
export const updatePackage = async (req, res) => {
    try {
        const { packageId } = req.params;
        const pkg = await PackageService.updatePackage(packageId, req.body);
        return res.status(200).json({
            success: true,
            data: pkg,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const togglePackageStatus = async (req, res) => {
    try {
        const { packageId } = req.params;
        const { isActive } = req.body;
        const result = await PackageService.togglePackageStatus(packageId, isActive);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getPackageById = async (req, res) => {
    try {
        const { packageId } = req.params;
        const pkg = await PackageService.getPackageById(packageId);
        return res.status(200).json({
            success: true,
            data: pkg,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getAllPackages = async (req, res) => {
    try {
        const { searchTerm, categoryId, locationId, tierId, limit, page, sortBy, sortOrder } = req.query;
        const parsedLimit = parsePositiveInteger(limit, 20, 100);
        const parsedPage = parsePositiveInteger(page, 1);
        const { data, total, page: currentPage, totalPages } = await PackageService.findPackages(searchTerm, categoryId, locationId, tierId, parsedLimit, parsedPage, true, // isActive
        true, // isComplete
        sortBy || "name", sortOrder || "asc");
        return res.status(200).json({
            success: true,
            data,
            total,
            currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to fetch packages",
        });
    }
};
export const getAllPackagesAdmin = async (req, res) => {
    try {
        const { searchTerm, categoryId, locationId, tierId, limit, page, isActive, isComplete, sortBy, sortOrder } = req.query;
        const activeBool = isActive === "true" ? true : isActive === "false" ? false : undefined;
        const completeBool = isComplete === "true" ? true : isComplete === "false" ? false : undefined;
        const parsedLimit = parsePositiveInteger(limit, 20, 100);
        const parsedPage = parsePositiveInteger(page, 1);
        const { data, total, page: currentPage, totalPages } = await PackageService.findPackages(searchTerm, categoryId, locationId, tierId, parsedLimit, parsedPage, activeBool, completeBool, sortBy || "name", sortOrder || "asc");
        return res.status(200).json({
            success: true,
            data,
            total,
            currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message ||
                "Failed to fetch packages",
        });
    }
};
export const updatePackageLocations = async (req, res) => {
    try {
        const { id } = req.params;
        const { locations } = req.body;
        const result = await PackageService.updatePackageLocations(id, locations);
        return res.status(200).json(result);
    }
    catch (error) {
        if (error.message === "Package not found") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const removePackageLocation = async (req, res) => {
    try {
        const { id, locationId } = req.params;
        const result = await PackageService.removePackageLocation(id, locationId);
        return res.status(200).json(result);
    }
    catch (error) {
        if (error.message === "Package not found") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const updatePackageTiers = async (req, res) => {
    try {
        const { id } = req.params;
        const { tiers } = req.body;
        const result = await PackageService.updatePackageTiers(id, tiers);
        return res.status(200).json(result);
    }
    catch (error) {
        if (error.message === "Package not found") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const removePackageTier = async (req, res) => {
    try {
        const { id, tierId } = req.params;
        const result = await PackageService.removePackageTier(id, tierId);
        return res.status(200).json(result);
    }
    catch (error) {
        if (error.message === "Package not found") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getFullPackage = async (req, res) => {
    try {
        const { packageId } = req.params;
        const data = await PackageService.getFullPackage(packageId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getFullPackageAdmin = async (req, res) => {
    try {
        const data = await PackageService.getFullPackageAdmin(req.params.packageId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(typeof error?.statusCode === "number" ? error.statusCode : 500).json({
            success: false,
            message: error.message || "Failed to fetch package",
        });
    }
};
export const getRelatedPackageService = async (req, res) => {
    try {
        const { packageId, tierId, locationId } = req.params;
        const data = await PackageService.getRelatedPackageService(packageId, tierId, locationId);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getPackageDiagnostics = async (req, res) => {
    try {
        const result = await PackageDiagnosticsEngine.analyze(req.params.packageId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getFullPackageByCities = async (req, res) => {
    try {
        const { packageId } = req.params;
        const { cityIds } = req.body;
        if (!Array.isArray(cityIds) || cityIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "cityIds must be a non-empty array",
            });
        }
        const data = await PackageService.getFullPackageByCities(packageId, cityIds);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
export const getPackagesByLocation = async (req, res) => {
    try {
        const { cityIds, categoryIds, limit, page, sortBy, sortOrder } = req.query;
        const cityIdArray = parseIdList(cityIds);
        const categoryIdArray = parseIdList(categoryIds);
        const parsedLimit = parsePositiveInteger(limit, 20, 100);
        const parsedPage = parsePositiveInteger(page, 1);
        const { data, total, page: currentPage, totalPages } = await PackageService.getPackagesByLocation(cityIdArray, categoryIdArray, parsedLimit, parsedPage, 
        // USER endpoint: never allow caller to request hidden packages.
        true, true, sortBy || "name", sortOrder || "asc");
        return res.status(200).json({
            success: true,
            data,
            total,
            page: currentPage,
            totalPages,
        });
    }
    catch (error) {
        return res.status(typeof error?.statusCode === "number" ? error.statusCode : 400).json({
            success: false,
            message: error.message,
        });
    }
};
export const exportPackagesToCsv = async (req, res) => {
    try {
        const { packageIds } = req.body;
        const { csv, total } = await PackageService.exportPackagesToCsv(packageIds);
        const fileName = `packages-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("X-Export-Count", String(total));
        return res.status(200).send(`\uFEFF${csv}`);
    }
    catch (error) {
        const status = typeof error?.statusCode === "number" ? error.statusCode : error?.message === "No packages found for export" ? 404 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Failed to export packages",
        });
    }
};
//# sourceMappingURL=package.controllers.js.map