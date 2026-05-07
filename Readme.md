ToDo:
1. Create a flow once after user has selected location
2. Create services API next



import { Schema, model, type Document, Types } from 'mongoose';

export interface IBooking extends Document {
    customerId: Types.ObjectId;
    coordinatorId?: Types.ObjectId; // Assigned Sub-Admin
    serviceId?: Types.ObjectId;     // Single ritual
    packageId?: Types.ObjectId;     // Or a bundle
    locationId: Types.ObjectId;      // Where the ritual happens
    
    scheduledDate: Date;
    status: 'PENDING' | 'ASSIGNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
    coordinatorEarnings: number; // The "Empowerment" part
}

const bookingSchema = new Schema<IBooking>({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coordinatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    packageId: { type: Schema.Types.ObjectId, ref: 'Package' },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    
    scheduledDate: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['PENDING', 'ASSIGNED', 'ONGOING', 'COMPLETED', 'CANCELLED'], 
        default: 'PENDING' 
    },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
    
    basePrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },
    coordinatorEarnings: { type: Number, required: true }
}, { timestamps: true });

export const Booking = model<IBooking>('Booking', bookingSchema);





New API Structure flow service

I’ll map your entire backend routes based on your actual flow:

Service → Location → Tier → Components → Pricing
🧠 1. SERVICE ROUTES (Core Master)

Base:

/services
CRUD
POST /services → create service
GET /services → list all services (filters: category, active)
GET /services/:id → get single service (basic info)
PATCH /services/:id → update service
DELETE /services/:id → soft delete / deactivate
Service Configuration (IMPORTANT)
Add / Update Locations
POST   /services/:id/locations
PATCH  /services/:id/locations
DELETE /services/:id/locations/:locationId
Add / Update Tiers
POST   /services/:id/tiers
DELETE /services/:id/tiers/:tierId
Optional (recommended)
Clone Service Structure
POST /services/:id/clone
Activate / Deactivate
PATCH /services/:id/status
🧠 2. SERVICE COMPONENT ROUTES

Base:

/service-components

This is your Tier → Component mapping layer

CRUD
POST /service-components
GET /service-components?serviceId=&tierId=
GET /service-components/:id
PATCH /service-components/:id
DELETE /service-components/:id
Bulk operations (VERY important)
Assign multiple components to tier
POST /service-components/bulk
Replace components for a tier
PUT /service-components/replace
Utility routes
Get components by service + tier
GET /service-components/service/:serviceId/tier/:tierId
🧠 3. SERVICE PRICING ROUTES

Base:

/service-pricing

This is your final layer (money layer)

CRUD
POST /service-pricing
GET /service-pricing?serviceId=&tierId=&locationId=
GET /service-pricing/:id
PATCH /service-pricing/:id
DELETE /service-pricing/:id
Bulk Pricing (CRITICAL for real apps)
Set pricing for a full tier
POST /service-pricing/bulk/tier
Set pricing for a location
POST /service-pricing/bulk/location
Update price matrix
PUT /service-pricing/matrix
Utility route (MOST IMPORTANT)
Get pricing for UI flow
GET /service-pricing/resolve

Query:

serviceId
tierId
locationId

👉 Returns:

components
required flags
prices merged
🧠 4. MASTER UI FLOW ROUTE (VERY IMPORTANT)

This is what your frontend will heavily use:

GET /services/:id/full
Returns:
{
  service,
  locations,
  tiers,
  components: {
    tierId: [
      {
        component,
        isRequired,
        pricing: {
          locationId,
          price
        }
      }
    ]
  }
}

👉 This replaces multiple API calls in UI.

🧠 FINAL ROUTE STRUCTURE (CLEAN SUMMARY)
SERVICES
- CRUD services
- manage locations
- manage tiers
- full service view

SERVICE COMPONENTS
- CRUD mappings
- bulk assign
- filter by service/tier

SERVICE PRICING
- CRUD pricing
- bulk pricing
- resolve pricing (core UI API)
- pricing matrix updates
⚡ BEST PRACTICE (important)

You should treat these as 3 layers:

1. Service (structure layer)
2. Component (logic layer)
3. Pricing (business layer)


SERVICES
- CRUD
- manage locations (PUT)
- manage tiers (PUT)
- validate
- publish
- config view

SERVICE COMPONENTS
- bulk assign
- replace
- copy tier
- list

SERVICE PRICING
- bulk upsert
- matrix update
- list

RUNTIME
- resolve service (core API)
