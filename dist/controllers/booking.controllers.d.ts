import type { Request, Response } from "express";
export declare const paymentWebhooks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const retryPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const paymentStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const searchBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingNotes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingSchedule: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const refundBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const expirePayments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Get coordinators eligible for a specific booking.
 */
export declare const getAvailableCoordinators: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Customer selects a coordinator for the booking.
 */
export declare const selectCoordinator: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Coordinator accepts or rejects the assignment request.
 */
export declare const respondToAssignment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Customer or coordinator requests reassignment.
 */
export declare const requestReassignment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Pending assignment requests visible to a coordinator.
 */
export declare const getCoordinatorAssignmentRequests: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Accepted, ongoing, and completed bookings of a coordinator.
 */
export declare const getCoordinatorBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Process coordinators who did not respond before their deadline.
 */
export declare const processAssignmentTimeouts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Return only the operational execution details of a booking.
 */
export declare const getBookingExecution: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Coordinator marks arrival at the service location.
 */
export declare const markCoordinatorArrived: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Verify the customer OTP before beginning service execution.
 */
export declare const verifyBookingOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Start one service execution.
 */
export declare const startBookingService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Complete one service execution.
 */
export declare const completeBookingService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Skip one service execution.
 */
export declare const skipBookingService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Add a completed milestone to booking execution.
 */
export declare const addBookingMilestone: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Complete the complete booking execution workflow.
 */
export declare const completeBookingExecution: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const generateBookingOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=booking.controllers.d.ts.map