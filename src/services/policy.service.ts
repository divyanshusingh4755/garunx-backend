import { Types } from "mongoose";

import { Content } from "../models/policy.model.js";

type PolicyType = "TERMS" | "PRIVACY" | "REFUND";

type UserType = "User" | "Coordinator";

interface CreatePolicyPayload {
  type: PolicyType;
  userType: UserType;
  title: string;
  content: string;
}

interface UpdatePolicyPayload {
  title?: string;
  content?: string;
}

export class PolicyService {
  static async createPolicy(payload: CreatePolicyPayload) {
    const latestPolicy = await Content.findOne({
      type: payload.type,
      userType: payload.userType,
    })
      .sort({ version: -1 })
      .lean();

    const policy = await Content.create({
      ...payload,
      version: (latestPolicy?.version || 0) + 1,
      isActive: false,
    });

    return policy;
  }

  static async updatePolicy(id: string, payload: UpdatePolicyPayload) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid policy id");
    }

    const policy = await Content.findByIdAndUpdate(
      id,
      {
        $set: payload,
      },
      {
        new: true,
      },
    );

    if (!policy) {
      throw new Error("Policy not found");
    }

    return policy;
  }

  static async getAllPolicies(
    page = 1,
    limit = 20,
    type?: PolicyType,
    userType?: UserType,
  ) {
    const skip = (page - 1) * limit;

    const query: {
      type?: PolicyType;
      userType?: UserType;
    } = {};

    if (type) {
      query.type = type;
    }

    if (userType) {
      query.userType = userType;
    }

    const [data, total] = await Promise.all([
      Content.find(query)
        .sort({
          type: 1,
          userType: 1,
          version: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Content.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async togglePolicyStatus(id: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid policy id");
    }

    const policy = await Content.findById(id);

    if (!policy) {
      throw new Error("Policy not found");
    }

    if (isActive) {
      await Content.updateMany(
        {
          type: policy.type,
          userType: policy.userType,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
          },
        },
      );

      policy.isActive = true;
      policy.publishedAt = new Date();
    } else {
      policy.isActive = false;
    }

    await policy.save();

    return policy;
  }

  static async getPolicyByType(
    type: PolicyType,
    userType: UserType,
  ) {
    const policy = await Content.findOne({
      type,
      userType,
      isActive: true,
    })
      .select({
        type: 1,
        userType: 1,
        title: 1,
        content: 1,
        version: 1,
        publishedAt: 1,
      })
      .lean();

    if (!policy) {
      throw new Error(`${type} policy not found`);
    }

    return policy;
  }
}
