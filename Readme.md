Core System Flows You Need
Your platform essentially has 8 major flows:

1. Cart Creation Flow
2. Checkout Flow
3. Booking Creation Flow
4. Payment Flow
5. Payment Retry Flow
6. Booking Lifecycle Flow
7. Cancellation & Refund Flow
8. Expiry/Cleanup Flow

FLOW 1 — Cart Creation Flow
Already mostly complete.

Goal
Allow user to build editable temporary configuration.

State
ACTIVE
User Can
choose service/package
select tier
select location
choose components
choose addon services
select date/time
update customer details
update notes
Important Rules

Cart remains mutable until checkout starts.

Cart Expiry

Guest carts:
expiresAt = now + 7 days

Optional.
booking flow:


FLOW 2 — Checkout Flow
This is where transactional logic begins.

Goal
Validate and freeze the cart before payment.

Steps
Step 1 — Validate Cart

Verify:
service exists
package exists
tier exists
location exists
selected items valid
prices valid
slot available
Step 2 — Recalculate Prices

Never trust frontend totals.

Recompute:
basePrice
addonPrice
totalAmount

server-side.

Step 3 — Lock Cart
cart.status = "LOCKED"
cart.lockedAt = new Date()

Now cart becomes immutable.

Step 4 — Create Booking

Booking:
status = "PENDING"
payment.status = "PENDING"

Step 5 — Set Payment Expiry
paymentExpiresAt = now + 15 mins



FLOW 3 — Booking Creation Flow
This is the MOST IMPORTANT flow in the system.

Goal
Convert temporary cart into permanent immutable transaction.

Responsibilities
Create Snapshot

Very important.

Copy:
service name
package name
pricing
selected components
addon services
customer details
location
tier

into booking.

Why Snapshot Matters

Because later:
prices may change
services deleted
package modified
location renamed

Booking history must remain correct forever.

Booking Is Immutable

After creation:
NEVER sync booking from cart
NEVER sync booking from service/package

Booking becomes source of truth.


FLOW 4 — Payment Flow
This is separate from booking lifecycle.

Very important distinction.

Payment State Machine
PENDING
FAILED
PAID
REFUNDED
PARTIAL_REFUND

Independent from booking state.

Online Payment Flow
Step 1 — Create Payment Order

Example:
Razorpay order
Stripe session

Store:
providerOrderId

Step 2 — User Pays
Frontend payment UI.

Step 3 — Webhook Arrives
NEVER trust frontend success alone.

Webhook is source of truth.

Step 4 — Verify Signature
Critical security step.

Step 5 — Mark Payment Paid
payment.status = "PAID"
payment.paidAt = new Date()

Step 6 — Confirm Booking
booking.status = "CONFIRMED"
booking.lifecycle.confirmedAt = new Date()



FLOW 5 — Payment Retry Flow
This is where many systems fail architecturally.

Scenario

User:
closes tab
payment fails
UPI timeout
bank issue
Correct Behavior

DO NOT:
delete booking
recreate cart

Instead:
booking remains PENDING
Allow retry.
Retry Rules
Retry allowed only if:

booking.status === "PENDING"
payment.status !== "PAID"

and:
payment not expired

Retry Flow
Create New Provider Order

Generate fresh:
providerOrderId

Increment Attempts
payment.attempts += 1
Continue Payment


FLOW 6 — Booking Lifecycle Flow
Now booking becomes operational.

States
PENDING
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED

Allowed Transitions
PENDING → CONFIRMED
PENDING → CANCELLED
CONFIRMED → IN_PROGRESS
CONFIRMED → CANCELLED
IN_PROGRESS → COMPLETED
COMPLETED → immutable
CANCELLED → immutable

Very important:
Prevent invalid transitions.


FLOW 7 — Cancellation & Refund Flow
Very important operationally.

Cancellation Scenarios
Before Payment

Easy:
booking.status = "CANCELLED"

No refund needed.

After Payment
Need refund workflow.

Refund Flow
PAID booking
   ↓
cancelBooking()
   ↓
trigger refund
   ↓
payment.status = REFUNDED

Partial Refund
Useful later.

Example:
admin fee retained
addon non-refundable

Your schema already supports this.

Excellent.


FLOW 8 — Expiry & Cleanup Flow
Critical production feature.

Problem
User:
creates booking
never pays

You must clean stale bookings.

Cron Job
Every few minutes:
Find:
status = "PENDING"
payment.status != "PAID"
paymentExpiresAt < now

Then:
booking.status = "CANCELLED"
cart.status = "EXPIRED"


Later flow to be discussed

Important Architectural Principle
Cart Lifecycle != Booking Lifecycle

This separation is critical.

Cart

Temporary editable state.

Booking

Permanent transactional state.

Payment

Financial state machine.

Service Execution

Operational workflow.

All are separate concerns.

Recommended Next Discussion Topics

Before coding, you should still finalize:

1. Slot Locking Strategy

Very important.

Questions:

when do you reserve slot?
during checkout?
after payment?
auto-release on expiry?

This affects concurrency heavily.

2. Idempotency

Critical for:

webhooks
retries
duplicate requests

Need:

same webhook should not confirm twice
3. Transaction Strategy

Will you use:

MongoDB transactions?
compensating actions?

Important during:

cart lock + booking create
4. Multi-Service Package Execution

Your schema supports packages.

Need to define:

do included services complete independently?
one master completion?
per-service execution?
5. Notification Flow

When to send:

booking created
payment success
booking confirmed
reminder
completion
6. Admin Operations

Need to define:

admin confirm
admin cancel
manual payment verification
manual completion
7. Rescheduling Flow

Eventually users may:

change date
change time
change location

Need rules around:

payment adjustments
slot release/rebooking


Your System Now Has 3 Major Modules
1. Cart Module
2. Booking Module
3. Payment Module

Keep them separate.

Do NOT mix:

payment logic into cart
booking lifecycle into payment
cart editing into booking

That separation will save you later.

Recommended Architecture
1. CART MODULE

Handles:

temporary editable configuration

You already mostly built this.

2. BOOKING MODULE

Handles:

transactional booking lifecycle

This is what you’re starting now.

3. PAYMENT MODULE

Handles:

gateway orchestration + payment state

Separate concern.

What APIs / Services You Need

I’ll divide this into:

Core Booking APIs
Payment APIs
Lifecycle APIs
Internal/Cron Services
Admin APIs
CORE BOOKING APIs

These are mandatory.

1. createBookingFromCart()
Purpose

Converts locked cart → booking.

This is your MOST important service.

Service
createBookingFromCart(cartId, userId)
Responsibilities
validate cart
verify not already converted
lock cart
freeze pricing
create immutable snapshot
create booking
initialize payment state
set payment expiry
attach booking to cart
API
POST /bookings/from-cart/:cartId
Returns
{
  "bookingId": "...",
  "bookingReference": "BK-000001",
  "status": "PENDING"
}
2. getBookingDetails()
API
GET /bookings/:bookingId
Purpose

Customer views booking.

3. listUserBookings()
API
GET /bookings

Query:

?status=PENDING
?page=1
PAYMENT APIs

Very important separation.

4. initiatePayment()
Purpose

Creates provider payment order.

API
POST /bookings/:bookingId/payment/initiate
Responsibilities
verify booking payable
verify not already paid
verify not expired
create Razorpay order
increment attempts
store providerOrderId
Returns
{
  "providerOrderId": "...",
  "amount": 1000,
  "currency": "INR"
}
5. verifyPaymentWebhook()

CRITICAL API.

API
POST /payments/webhook
Responsibilities
verify webhook signature
verify event authenticity
locate booking
ensure idempotency
mark payment success/failure
confirm booking
IMPORTANT

This endpoint becomes:

SOURCE OF TRUTH

NOT frontend callback.

6. retryPayment()

You may keep separate OR reuse initiatePayment.

API
POST /bookings/:bookingId/payment/retry
Rules

Allowed only if:

booking.status === "PENDING"
payment.status !== "PAID"
BOOKING LIFECYCLE APIs

These turn system into real platform.

7. confirmBooking()

Sometimes automatic.
Sometimes admin-driven.

Service
confirmBooking(bookingId)
Responsibilities
booking.status = "CONFIRMED"
booking.lifecycle.confirmedAt = new Date()
API

Optional publicly.

Usually internal/admin.

PATCH /admin/bookings/:bookingId/confirm
8. startBookingExecution()

Optional initially.

Useful later.

API
PATCH /admin/bookings/:bookingId/start
Responsibilities
booking.status = "IN_PROGRESS"
9. completeBooking()

Mandatory eventually.

API
PATCH /admin/bookings/:bookingId/complete
Responsibilities
booking.status = "COMPLETED"
booking.lifecycle.completedAt = new Date()
10. cancelBooking()

Very important.

API
POST /bookings/:bookingId/cancel
Responsibilities
validate cancellable
process refund if paid
release slot
mark cancelled
record reason
audit who cancelled
INTERNAL / CRON SERVICES

These are extremely important.

11. expirePendingBookings()

Cron job.

Service
expirePendingBookings()
Responsibilities

Find:

PENDING + payment expired

Then:

booking.status = "CANCELLED"
cart.status = "EXPIRED"
12. releaseExpiredSlots()

If slot system exists.

13. cleanupExpiredCarts()

Optional.

ADMIN APIs

Very important operationally.

14. adminListBookings()
API
GET /admin/bookings

Filters:

status
payment status
date
location
service
15. adminBookingDetails()
API
GET /admin/bookings/:bookingId
16. adminCancelBooking()

Admin override.

17. adminRefundBooking()

Manual refund support.

VERY IMPORTANT

Now let’s classify what should be:

PUBLIC APIs

Accessible by customer.

create booking
view booking
list bookings
initiate payment
retry payment
cancel booking
INTERNAL SERVICES

No direct API exposure.

confirmBooking()
expirePendingBookings()
handlePaymentSuccess()
ADMIN APIs

Operational control.

confirm
complete
refund
manual cancel
Recommended Service Layer Structure
BookingService
createBookingFromCart()
getBookingById()
listBookings()
confirmBooking()
completeBooking()
cancelBooking()
expirePendingBookings()
PaymentService
initiatePayment()
retryPayment()
handlePaymentSuccess()
handlePaymentFailure()
verifyWebhook()
refundPayment()
CartService

Already mostly done.

Should now additionally support:

lockCart()
expireCart()
Suggested Development Order

VERY important.

Build in this order:

PHASE 1

Core booking creation.

createBookingFromCart()
getBooking()
listBookings()

WITHOUT payment initially.

PHASE 2

Payment integration.

initiatePayment()
webhook handling
payment success/failure
PHASE 3

Lifecycle management.

confirm
complete
cancel
expire
PHASE 4

Admin tools.


CART → CHECKOUT → BOOKING CREATED → PAYMENT → CONFIRMATION → SERVICE EXECUTION → COMPLETION

🧠 What you should build next (important)

Now that checkout is done, next logical services are:

1. confirmBooking()

Used when:

payment success webhook
admin approval
booking.status = "CONFIRMED";
booking.lifecycle.confirmedAt = new Date();
2. completeBooking()

Used when service is done

booking.status = "COMPLETED";
booking.lifecycle.completedAt = new Date();
3. cancelBooking()

Used anytime before completion

booking.status = "CANCELLED";
booking.lifecycle.cancelledAt = new Date();
⚠️ Important insight

Right now your system is:

"Checkout system"

But not yet a:

"Booking management system"

Lifecycle methods turn it into a real booking platform.
