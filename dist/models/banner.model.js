import { model, Schema, Types } from "mongoose";
const bannerSchema = new Schema({
    version: {
        type: Number,
        default: 1,
        min: 1,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
    },
    buttonText: {
        type: String,
        trim: true,
        maxlength: 80,
    },
    placement: {
        type: String,
        required: true,
        enum: ["HOME_TOP", "HOME_MIDDLE", "HOME_BOTTOM", "CATEGORY", "PRODUCT"],
    },
    format: {
        type: String,
        required: true,
        enum: ["WEB", "MOBILE", "BOTH"],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    image: {
        type: String,
        required: true,
        trim: true,
    },
    displayOrder: {
        type: Number,
        default: 0,
        min: 0,
    },
    redirect: {
        type: {
            type: String,
            enum: ["NONE", "SERVICE", "PACKAGE", "CATEGORY", "PRODUCT", "URL"],
            default: "NONE",
            required: true,
        },
        refId: {
            type: Schema.Types.ObjectId,
            default: undefined,
        },
        url: {
            type: String,
            trim: true,
            default: undefined,
        },
    },
}, {
    timestamps: true,
});
bannerSchema.pre("validate", function () {
    const redirectType = this.redirect?.type ?? "NONE";
    this.redirect ??= { type: "NONE" };
    if (["SERVICE", "PACKAGE", "CATEGORY", "PRODUCT"].includes(redirectType)) {
        if (!this.redirect.refId) {
            throw new Error("refId is required for this redirect type");
        }
        delete this.redirect.url;
        return;
    }
    if (redirectType === "URL") {
        if (!this.redirect.url?.trim()) {
            throw new Error("url is required when redirect type is URL");
        }
        delete this.redirect.refId;
        return;
    }
    delete this.redirect.refId;
    delete this.redirect.url;
});
bannerSchema.index({ name: 1 });
bannerSchema.index({ placement: 1, format: 1, isActive: 1, displayOrder: 1 });
bannerSchema.index({ "redirect.type": 1, "redirect.refId": 1 });
bannerSchema.index({ name: "text", description: "text" }, { name: "BannerTextSearchIndex" });
export const Banner = model("Banner", bannerSchema);
//# sourceMappingURL=banner.model.js.map