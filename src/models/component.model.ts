import {
  model,
  Schema,
  type Types,
} from "mongoose";

export interface IComponent {
  name: string;
  isRemovable: boolean;
  isBundled: boolean;
  categoryId: Types.ObjectId;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const componentSchema =
  new Schema<IComponent>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      isRemovable: {
        type: Boolean,
        required: true,
        default: true,
      },

      isBundled: {
        type: Boolean,
        required: true,
        default: true,
      },

      categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },

      description: {
        type: String,
        required: true,
        trim: true,
      },

      imageUrl: {
        type: String,
        trim: true,
      },

      isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

componentSchema.index({
  categoryId: 1,
});

componentSchema.index(
  {
    name: "text",
    description: "text",
  },
  {
    name: "ComponentTextSearchIndex",
  },
);

componentSchema.index({
  isRemovable: 1,
  createdAt: -1,
});

componentSchema.index({
  isBundled: 1,
  createdAt: -1,
});

export const Component =
  model<IComponent>(
    "Component",
    componentSchema,
  );
