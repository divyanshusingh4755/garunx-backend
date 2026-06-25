Booking & Coordinator Assignment Flow
Coordinator Selection
1. Coordinator Listing
Coordinators displayed to users are determined by:
Admin-defined configuration/criteria
Coordinator ratings & reviews
Coordinator availability
Other configurable ranking rules
2. User Selection
User can select up to 3 preferred coordinators for a booking.
3. Booking Request Process
Booking request is sent to all selected coordinators.
Coordinators can:
Accept
Decline
4. Assignment Logic
The coordinator who accepts first gets assigned to the booking.
Remaining requests are automatically closed.
Coordinator Capacity Management
Daily Limit
A coordinator can have a maximum of 5 bookings per day.
Once a coordinator reaches the daily limit:
They are removed from the available coordinator list for that day.
If any of the booking is completed by coordinator then he can again get booking in that day.
Coordinator will have button to put there work status as off or available.
Users are shown other eligible coordinators.
Reassignment & Rescheduling
User Reschedule
User can reschedule a booking.
New coordinator availability check is performed.
Booking assignment flow may restart if required.
Coordinator Reassignment
Assigned coordinator can request reassignment.
System displays available coordinators.
Booking can be transferred to another coordinator.
Coordinator Decline
If all selected coordinators decline:
User is prompted to select another coordinator from available options.
Auto Assignment
Timeout Handling
If booking remains unassigned until a configured cutoff time:
Cron job runs.
System automatically assigns the best available coordinator based on admin rules.
Cancellation Flow
User Cancellation
User can cancel booking only after a coordinator has been assigned.
Cancellation policy may apply.
Coordinator Action
Coordinator cannot directly cancel a booking.
Coordinator can only:
Accept
Decline
Request reassignment (if already assigned)
Admin Cancellation
Admin can cancel any booking.
Refund Flow

Refund should depend on cancellation source:

Action	Refund
User cancels before coordinator assigned	Full refund
User cancels after coordinator assigned	Configurable refund policy
Coordinator declines	No refund impact
Admin cancels	Full refund
System auto-cancels	Full refund
Clarifications Needed
1. First Acceptance vs Priority

You mention:

User selects 3 coordinators.
First coordinator who accepts gets assigned.

Question:

Should higher-rated coordinators get a longer response window before lower-rated coordinators receive the request? - Yes
Or should all 3 receive the request simultaneously?
2. Daily Booking Limit

When reassignment happens:

Does the transferred booking count toward the new coordinator's 5-booking limit? - Yes
3. Auto Assignment

If no coordinator accepts:

Should auto-assignment ignore the user's original coordinator preferences? - Yes
Or assign only from the originally selected coordinators?
4. User Cancellation

You mention:

User can cancel only after coordinator is assigned.

Can user cancel before assignment if they change their mind? This usually reduces support issues. - Yes

5. Refund Rules

Need to define:

Full refund %
Partial refund %
Non-refundable window
Refund processing method
Suggested Status Flow
Draft
  ↓
Coordinator Selection
  ↓
Pending Coordinator Response
  ↓
Assigned
  ↓
Completed

Alternative Paths:
Pending → Declined
Pending → Auto Assigned
Assigned → Rescheduled
Assigned → Reassigned
Assigned → Cancelled
Assigned → Refunded

Overall, this looks like a marketplace-style booking system where coordinator assignment is semi-manual (user choice) but backed by automatic assignment and capacity management. The main area to finalize is the exact assignment algorithm and refund rules.
