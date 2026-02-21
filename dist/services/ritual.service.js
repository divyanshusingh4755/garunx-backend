import { Service } from '../models/service.model.js';
export class RitualService {
    static async create(data) {
        try {
            return await Service.create(data);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async findAll(filter = {}) {
        try {
            const finalFilter = {
                isActive: filter.isActive !== undefined ? filter.isActive : true,
                ...filter
            };
            return await Service.find(finalFilter).sort({ createdAt: -1 });
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async findById(id) {
        try {
            return await Service.findById(id);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async update(id, data) {
        try {
            return await Service.findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true
            });
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async remove(id) {
        try {
            return await Service.findByIdAndDelete(id);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
}
;
//# sourceMappingURL=ritual.service.js.map