const statusMessages = {
  pending: "Account is pending admin verification",
  rejected: "Account has been rejected by admin",
  suspended: "Account has been suspended",
  unverified: "Account is not verified",
};

export function getBlockedStatusResponse(user) {
  if (!user.emailVerified) {
    return {
      statusCode: 403,
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Email verification required",
      accountStatus: user.status,
    };
  }

  if (user.status !== "verified") {
    return {
      statusCode: 403,
      code: `ACCOUNT_${String(user.status || "unknown").toUpperCase()}`,
      message: statusMessages[user.status] || "Account is not verified",
      accountStatus: user.status,
    };
  }

  return null;
}

export function sanitizeUser(user) {
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  const {
    passwordHash,
    verificationOtp,
    verificationOtpExpiresAt,
    refreshTokens,
    passwordResetOtp,
    passwordResetOtpExpiresAt,
    ...safeUser
  } = source;
  return safeUser;
}
