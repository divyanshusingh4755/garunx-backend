import {
  Schema,
  model,
  type Types,
} from "mongoose";

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface ICity {
  name: string;
  country: string;
  stateId: Types.ObjectId;
  image?: string;
  description?: string;
  isActive: boolean;
  location?: IGeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<ICity>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    stateId: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
      index: true,
    },

    image: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },

      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (
            coordinates: number[],
          ): boolean =>
            coordinates.length === 2 &&
            coordinates.every(Number.isFinite) &&
            coordinates[0]! >= -180 &&
            coordinates[0]! <= 180 &&
            coordinates[1]! >= -90 &&
            coordinates[1]! <= 90,

          message:
            "Coordinates must be valid [longitude, latitude]",
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

citySchema.index({
  location: "2dsphere",
});

citySchema.index({
  country: 1,
  stateId: 1,
  name: 1,
});

citySchema.index({
  isActive: 1,
  createdAt: -1,
});

citySchema.index(
  {
    name: "text",
  },
  {
    name: "CityTextSearchIndex",
  },
);

export const City = model<ICity>(
  "City",
  citySchema,
);
