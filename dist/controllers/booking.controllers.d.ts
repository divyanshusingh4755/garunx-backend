import type { Request, Response } from "express";
export declare const paymentWebhooks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const retryPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const paymentStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const searchBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingNotes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rescheduleBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateBookingStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const refundBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const expirePayments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyBookings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const cancelBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAvailableCoordinators: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const selectCoordinator: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const respondToAssignment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const requestReassignment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Coordinator booking list.
 *
 * Views:
 * - REQUESTS: Pending booking requests awaiting coordinator response
 * - BOOKINGS: Accepted, ongoing, completed, or cancelled bookings
 */
export declare const getCoordinatorBookingList: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const processAssignmentTimeouts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingExecution: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markCoordinatorArrived: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const verifyBookingOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const startBookingService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const completeBookingService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const skipBookingService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addBookingMilestone: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const completeBookingExecution: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const generateBookingOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBookingInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBeneficiaryBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const exportBookingsCsv: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCoordinatorSelectionConfig: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateCoordinatorSelectionConfig: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=booking.controllers.d.ts.map