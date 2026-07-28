import { Schema } from "mongoose";
import type { ILineTax, ITaxProfileSnapshot, TaxJurisdiction, TaxPriceMode } from "../types/tax.types.js";
export declare const taxProfileSnapshotSchema: Schema<ITaxProfileSnapshot, import("mongoose").Model<ITaxProfileSnapshot, any, any, any, (import("mongoose").Document<unknown, any, ITaxProfileSnapshot, any, import("mongoose").DefaultSchemaOptions> & ITaxProfileSnapshot & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (import("mongoose").Document<unknown, any, ITaxProfileSnapshot, any, import("mongoose").DefaultSchemaOptions> & ITaxProfileSnapshot & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, ITaxProfileSnapshot>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    taxProfileId?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    name?: import("mongoose").SchemaDefinitionProperty<string, ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    code?: import("mongoose").SchemaDefinitionProperty<string, ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    treatment?: import("mongoose").SchemaDefinitionProperty<"TAXABLE" | "EXEMPT" | "NIL_RATED" | "NON_GST", ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    totalRate?: import("mongoose").SchemaDefinitionProperty<number, ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    priceMode?: import("mongoose").SchemaDefinitionProperty<TaxPriceMode, ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    source?: import("mongoose").SchemaDefinitionProperty<import("../types/tax.types.js").TaxSource, ITaxProfileSnapshot, import("mongoose").Document<unknown, {}, ITaxProfileSnapshot, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ITaxProfileSnapshot & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, ITaxProfileSnapshot>;
export declare const lineTaxSchema: Schema<ILineTax, import("mongoose").Model<ILineTax, any, any, any, (import("mongoose").Document<unknown, any, ILineTax, any, import("mongoose").DefaultSchemaOptions> & ILineTax & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (import("mongoose").Document<unknown, any, ILineTax, any, import("mongoose").DefaultSchemaOptions> & ILineTax & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, ILineTax>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    profile?: import("mongoose").SchemaDefinitionProperty<ITaxProfileSnapshot, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    jurisdiction?: import("mongoose").SchemaDefinitionProperty<TaxJurisdiction, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    taxableAmount?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    cgstRate?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    cgstAmount?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    sgstRate?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    sgstAmount?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    igstRate?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    igstAmount?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    totalTax?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    finalAmount?: import("mongoose").SchemaDefinitionProperty<number, ILineTax, import("mongoose").Document<unknown, {}, ILineTax, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ILineTax & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, ILineTax>;
//# sourceMappingURL=tax.schema.d.ts.map