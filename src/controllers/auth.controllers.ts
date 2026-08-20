import type { Request, Response } from "express";
import AuthService from "../services/auth.service.js";
import { Role } from "../types/rbac.js";
import { getClientIp } from "../utils/clientIp.js";
import { ApprovalStatus, AvailabilityStatus, type Caste, type Gotra } from "../types/enums.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { role, password, userEmail, phoneNumber } = req.body;
    const user = await AuthService.registerUser(role, password, userEmail, phoneNumber);

    const nextStep = "VERIFY_OTP";

    res.status(201).json({
      success: true,
      message: "Registration initiated. Please verify your OTP.",
      user: {
        userId: user._id,
        role: user.role,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isOtpVerified: user.isOtpVerified,
        otp: user.otp,
        nextStep,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

export const socialAuth = async (req: Request, res: Response) => {
  try {
    const { role, idToken, email } = req.body;
    const { userAgent, ip } = getClientIp(req);

    const result = await AuthService.socialAuth(role, idToken, email, userAgent, ip);
    const nextStep = result.isNewUser ? "COMPLETE_PROFILE" : "DASHBOARD";

    res.status(200).json({
      success: true,
      message: result.isNewUser ? "Social account linked. Please complete your profile." : "Login successful",
      ...result,
      nextStep,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || "Social authentication failed",
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { userId, otp, email } = req.body;

    const user = await AuthService.verifyOtp(userId, otp, email);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP or Session expired",
      });
    }

    const isRegistrationFlow = !!userId;

    res.status(200).json({
      success: true,
      message: isRegistrationFlow ? "OTP verified. Please complete your profile." : "OTP verified. You may now reset your password.",
      data: {
        userId: user._id,
        role: user.role,
        isOtpVerified: user.isOtpVerified,
        isResetVerified: user.isResetVerified,
        isComplete: user.isComplete,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "OTP verification failed",
    });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { userId, email, role } = req.body;

    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: "Either User ID or email is required.",
      });
    }

    const result = await AuthService.resendOtp(userId, email, role);

    res.status(200).json({
      success: true,
      otp: result.otp,
      message: result.message || "A new OTP has been sent successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to resend OTP",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password, role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Please specify the role for login.",
      });
    }

    const { userAgent, ip } = getClientIp(req);
    const { user, accessToken, refreshToken } = await AuthService.loginUser(identifier, role, password, userAgent, ip);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error.message.includes("incomplete")) {
      return res.status(403).json({
        success: false,
        message: error.message,
        nextStep: "COMPLETE_PROFILE",
      });
    }

    if (error.message.includes("verify")) {
      return res.status(403).json({
        success: false,
        message: error.message,
        nextStep: "VERIFY_OTP",
      });
    }

    const statusCode = error.message.includes("not found") ? 404 : 401;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const oldToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!oldToken) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }

  try {
    const { userAgent, ip } = getClientIp(req);
    const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshAccesToken(oldToken, userAgent, ip);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    res.status(403).json({
      success: false,
      message: error.message || "Invalid refresh attempt",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    const { allDevices } = req.body; // Boolean from frontend

    if (refreshToken) {
      await AuthService.logoutUser(refreshToken, allDevices);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: allDevices ? "Logged out from all devices for this role" : "Logged out successfully",
    });
  } catch (error: any) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    res.status(200).json({ success: true, message: "Logged out" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and Role are required to reset password",
      });
    }

    const result = await AuthService.forgotPassword(email, role);

    res.status(200).json({
      success: true,
      otp: result.otp,
      message: result.message || "Reset code sent to your email",
      nextStep: "RESET_PASSWORD",
    });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message:
        error.message || "Error sending reset email. Please try again later.",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "UserId is missing"
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    await AuthService.resetPassword(userId, newPassword);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login with your new credentials.",
    });
  } catch (error: any) {
    const statusCode = error.message.includes("expired") || error.message.includes("invalid") ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to reset password.",
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) { return res.status(401).json({ success: false, message: "Unauthorized" }); }

    if (!oldPassword) {
      return res.status(400).json({
        success: false,
        message: "Existing Password missing"
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    await AuthService.changePassword(userId as string, oldPassword, newPassword);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login with your new credentials.",
    });
  } catch (error: any) {
    const statusCode = error.message.includes("expired") || error.message.includes("invalid") ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to reset password.",
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { limit, page, role, isComplete, isActive, search, sortBy, sortOrder } = req.query;

    const { users, pagination } = await AuthService.GetAllUsers(
      Number(page) || 1,
      Number(limit) || 40,
      role as Role,
      isComplete === "true" ? true : isComplete === "false" ? false : undefined,
      isActive === "true" ? true : isActive === "false" ? false : undefined,
      search as string,
      (sortBy as string) || "fullName",
      (sortOrder as "asc" | "desc") || "asc",
    );

    res.status(200).json({
      success: true,
      data: users,
      pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching users. Please try again later.",
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required."
      });
    }

    const data = await AuthService.GetUserById(id as string);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    const isNotFound = error.message.toLowerCase().includes("not found");
    const isInvalidId = error.name === "CastError" || error.message.includes("format");
    const status = isNotFound ? 404 : isInvalidId ? 400 : 500;

    res.status(status).json({
      success: false,
      message: error.message || "Error retrieving user data.",
    });
  }
};

export const getUserByEmailOrPhone = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const { role } = req.query;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required to identify the correct profile.",
      });
    }

    const data = await AuthService.GetUserByEmailOrPhone(identifier as string, role as Role);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    const isNotFound = error.message.includes("found");
    const status = isNotFound ? 404 : 500;

    res.status(status).json({
      success: false,
      message: error.message || "Error retrieving user data. Please try again later.",
    });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || status === undefined) {
      return res.status(400).json({
        success: false,
        message: "User ID and Status is required."
      });
    }

    await AuthService.deactivateUser(id as string, status);

    res.status(200).json({
      success: true,
      message: status ? "Account activated successfully" : "Account deactivated successfully and all sessions revoked",
    });
  } catch (error: any) {
    const isNotFound = error.message.toLowerCase().includes("not found");
    const isInvalidId = error.name === "CastError";

    const status = isNotFound ? 404 : isInvalidId ? 400 : 500;

    res.status(status).json({
      success: false,
      message: error.message || "Error deactivating user. Please try again later.",
    });
  }
};

export const completeProfile = async (req: Request, res: Response) => {
  try {
    const { userId, fullName, dob, gender, referralCode, password, profileImage, email, phoneNumber, caste, gotra } = req.body;

    if (!userId || !fullName) {
      return res.status(400).json({
        success: false,
        message: "User ID and Full Name are required.",
      });
    }

    const { userAgent, ip } = getClientIp(req);

    const { user, accessToken, refreshToken } = await AuthService.completeProfile(userId, fullName, dob, gender, referralCode, password, profileImage, userAgent, ip, email, phoneNumber, caste, gotra);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: "Profile completed successfully. You are now fully registered.",
      user,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Profile completion failed",
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId as string;
    const { fullName, dob, gender, profileImage, savedLocations } = req.body;

    const dataToUpdate: Record<string, unknown> = {};

    if (fullName !== undefined) { dataToUpdate.fullName = fullName }
    if (dob !== undefined) { dataToUpdate.dob = dob }
    if (gender !== undefined) { dataToUpdate.gender = gender }
    if (profileImage !== undefined) { dataToUpdate.profileImage = profileImage }
    if (savedLocations !== undefined) { dataToUpdate.savedLocations = savedLocations }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid profile fields provided",
      });
    }

    const user = await AuthService.updateProfile(userId, dataToUpdate);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadSingle = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, url: (req.file as any).location });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upload single image",
    });
  }
};

export const uploadMutliple = async (req: Request, res: Response) => {
  try {
    const urls = (req.files as any[]).map((file) => file.location);
    res.json({ success: true, urls });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upload multiple image",
    });
  }
};

export const submitVerificationDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const { aadharCard, panCard, bankPassbook, accountNumber, accountName, bankName, ifscCode } = req.body;

    const updatedUser = await AuthService.uploadVerificationDocuments(userId, { aadharCard, panCard, bankPassbook, accountNumber, accountName, bankName, ifscCode });
    const submitted: string[] = [];

    if (aadharCard || panCard) { submitted.push("Identity documents submitted for verification") }
    if (bankPassbook) { submitted.push("Bank details submitted for verification") }

    return res.status(200).json({
      success: true,
      message: submitted.join(". "),
      data: {
        identity: {
          status: updatedUser.documentVerification.status,
          isVerified: updatedUser.isDocumentVerified,
        },
        bank: {
          status: updatedUser.bankDocumentVerification.status,
          isVerified: updatedUser.isBankDocumentVerified,
        },
        coordinatorApproval: updatedUser.coordinatorProfile?.approvalStatus,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to submit verification documents",
    });
  }
};

export const approveOrRejectDocs = async (req: Request, res: Response) => {
  try {
    const { userId, type, status, rejectionReason } = req.body;

    const updatedUser = await AuthService.updateVerificationStatus(userId, type, status, rejectionReason);

    const verificationName = type === "document" ? "Identity documents" : "Bank details";

    return res.status(200).json({
      success: true,
      message: `${verificationName} ${status.toLowerCase()} successfully`,
      data: {
        userId: updatedUser?._id,
        documentStatus: updatedUser?.documentVerification.status,
        bankStatus: updatedUser?.bankDocumentVerification.status,
        isDocumentVerified: updatedUser?.isDocumentVerified,
        isBankDocumentVerified: updatedUser?.isBankDocumentVerified,
        coordinatorApprovalStatus: updatedUser?.coordinatorProfile?.approvalStatus,
      },
    });
  } catch (error: any) {
    const statusCode = error.message?.toLowerCase().includes("not found") ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update verification status",
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await AuthService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch current user",
    });
  }
};

export const updateCoordinatorApproval = async (
  req: Request,
  res: Response,
) => {
  try {
    const { coordinatorId } = req.params;
    const { status, rejectionReason } = req.body;

    const coordinator = await AuthService.updateCoordinatorApproval(coordinatorId as string, status as ApprovalStatus, rejectionReason);

    res.status(200).json({
      success: true,
      message: status === ApprovalStatus.APPROVED ? "Coordinator approved successfully" : "Coordinator approval updated successfully",
      data: coordinator,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : error.message.includes("verified") ? 409 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update coordinator approval",
    });
  }
};

export const updateCoordinatorAvailability = async (req: Request, res: Response) => {
  try {
    const coordinatorId = req.user?.userId;
    const { availabilityStatus } = req.body;

    if (!coordinatorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const data = await AuthService.updateCoordinatorAvailability(coordinatorId, availabilityStatus as AvailabilityStatus);

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : error.message.includes("approved") ? 403 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update availability",
    });
  }
};

export const updateCoordinatorSettings = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.userId;
    const { maxDailyBookings, autoAssignmentEnabled } = req.body;
    const { coordinatorId } = req.params;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!coordinatorId) {
      return res.status(400).json({
        success: false,
        message: "Coordinator ID is required."
      });
    }

    const data = await AuthService.updateCoordinatorSettings(coordinatorId as string, { maxDailyBookings, autoAssignmentEnabled });

    res.status(200).json({
      success: true,
      message: "Coordinator settings updated successfully",
      data,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : error.message.includes("approved") ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update coordinator settings",
    });
  }
};

export const updateServiceableLocations = async (req: Request, res: Response) => {
  try {
    const coordinatorId = req.user?.userId;
    const { serviceableLocations } = req.body;

    if (!coordinatorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const coordinator = await AuthService.updateCoordinatorServiceableLocations(coordinatorId, serviceableLocations);

    res.status(200).json({
      success: true,
      message: "Serviceable locations updated successfully",
      data: coordinator,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update serviceable locations",
    });
  }
};

export const getCoordinatorById = async (req: Request, res: Response) => {
  try {
    const { coordinatorId } = req.params;

    const coordinator = await AuthService.getCoordinatorById(
      coordinatorId as string,
    );

    res.status(200).json({
      success: true,
      data: coordinator,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch coordinator",
    });
  }
};

export const getCoordinators = async (req: Request, res: Response) => {
  try {
    const { page, limit, approvalStatus, availabilityStatus, locationId, caste, gotra, autoAssignmentEnabled, minimumRating, search, sortBy, sortOrder } = req.query;

    const filters: Parameters<typeof AuthService.getCoordinators>[0] = { page: Number(page) || 1, limit: Number(limit) || 20 };

    if (approvalStatus !== undefined) { filters.approvalStatus = approvalStatus as ApprovalStatus }
    if (availabilityStatus !== undefined) { filters.availabilityStatus = availabilityStatus as AvailabilityStatus }
    if (locationId !== undefined) { filters.locationId = locationId as string }
    if (caste !== undefined) { filters.caste = caste as Caste }
    if (gotra !== undefined) { filters.gotra = gotra as Gotra }
    if (autoAssignmentEnabled !== undefined) { filters.autoAssignmentEnabled = autoAssignmentEnabled === "true" }
    if (minimumRating !== undefined) { filters.minimumRating = Number(minimumRating) }
    if (search !== undefined) { filters.search = search as string }
    if (sortBy !== undefined) { filters.sortBy = sortBy as string }
    if (sortOrder !== undefined) { filters.sortOrder = sortOrder as "asc" | "desc" }

    const result = await AuthService.getCoordinators(filters);

    res.status(200).json({
      success: true,
      data: result.coordinators,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch coordinators",
    });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, phoneNumber } = req.body;

    const admin = await AuthService.createAdmin({ fullName, email, password, phoneNumber });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: admin,
    });
  } catch (error: any) {
    if (error.message === "Admin account with this email or phone number already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create admin account",
    });
  }
};

export const exportUsersCsv = async (req: Request, res: Response) => {
  try {
    const { userIds }: { userIds: string[] } = req.body;
    const result = await AuthService.exportUsersToCsv(userIds);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="users-${timestamp}.csv"`);

    return res.status(200).send(result.csv);
  } catch (error: any) {
    if (error.message === "No users found for export") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to export users",
    });
  }
};