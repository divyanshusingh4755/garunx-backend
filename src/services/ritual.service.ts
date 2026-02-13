import { Service, type IService } from '../models/service.model.js';

export class RitualService {
    static async create(data: Partial<IService>) {
        try {
            return await Service.create(data);
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    static async findAll(filter = {}) {
        try {
            return await Service.find({ ...filter, isActive: true }).sort({ createdAt: -1 });
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    static async findById(id: string) {
        try {
            return await Service.findById(id);
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    static async update(id: string, data: Partial<IService>) {
        try {
            return await Service.findByIdAndUpdate(id, data, {
                new: true,
                runValidators: true
            });
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    static async remove(id: string) {
        try {
            return await Service.findByIdAndDelete(id);
        } catch (error: any) {
            throw new Error(error.message)
        }
    }
};
