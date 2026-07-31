import {
  Schema,
  model,
  type Types,
} from "mongoose";

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface ILocation {
  name: string;
  country: string;
  stateId: Types.ObjectId;
  cityId: Types.ObjectId;
  fullAddress: string;
  pincode: string;
  image?: string;
  description?: string;
  isActive: boolean;
  location?: IGeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
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

    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },

    fullAddress: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
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

locationSchema.index({
  location: "2dsphere",
});

locationSchema.index({
  country: 1,
  stateId: 1,
  cityId: 1,
  pincode: 1,
});

locationSchema.index({
  isActive: 1,
  createdAt: -1,
});

locationSchema.index(
  {
    name: "text",
    fullAddress: "text",
    pincode: "text",
  },
  {
    name: "LocationTextSearchIndex",
  },
);

export const Location = model<ILocation>(
  "Location",
  locationSchema,
);
