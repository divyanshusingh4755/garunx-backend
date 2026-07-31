import { Schema, Types, model, } from "mongoose";
const userQueryActivitySchema = new Schema({
    queryId: {
        type: Schema.Types.ObjectId,
        ref: "UserQuery",
        required: true,
        index: true,
    },
    performedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            "QUERY_CREATED",
            "REQUESTER_REPLIED",
            "ADMIN_REPLIED",
            "STATUS_CHANGED",
            "ASSIGNED",
            "PRIORITY_CHANGED",
            "CATEGORY_CHANGED",
            "QUERY_DELETED",
        ],
        required: true,
        index: true,
    },
    oldValue: {
        type: Schema.Types.Mixed,
    },
    newValue: {
        type: Schema.Types.Mixed,
    },
    note: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
}, {
    timestamps: true,
});
userQueryActivitySchema.index({
    queryId: 1,
    createdAt: -1,
});
userQueryActivitySchema.index({
    queryId: 1,
    type: 1,
    createdAt: -1,
});
export const UserQueryActivity = model("UserQueryActivity", userQueryActivitySchema);
//# sourceMappingURL=userQueryActivity.model.js.map