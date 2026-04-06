import type { AUTH_ERROR_CODES } from "./constants";

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export type AuthIdentifierKind = "email" | "phone";

export interface ParsedAuthIdentifier {
  kind: AuthIdentifierKind;
  value: string;
  raw: string;
}

export type LoginAttemptStatus = "success" | "failure" | "blocked";

export interface AuthUserRecord {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string | null;
  failedLoginAttempts: number | null;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  name: string | null;
  image: string | null;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface AuthCredentialsInput {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface RequestPasswordResetInput {
  email: string;
}

export interface ConfirmPasswordResetInput {
  email: string;
  token: string;
  password: string;
}

export interface LoginAttemptRecordInput {
  identifier: string;
  userId: string | null;
  status: LoginAttemptStatus;
  reason: AuthErrorCode | null;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string | null;
  identifier: string;
  token: string;
  expires: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreatePasswordResetTokenInput {
  identifier: string;
  userId: string | null;
  token: string;
  expires: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface AuthenticateCredentialsResult {
  ok: true;
  user: AuthSessionUser;
  rememberMe: boolean;
  sessionMaxAgeSeconds: number;
}

export interface AuthenticateCredentialsFailureResult {
  ok: false;
  errorCode: AuthErrorCode;
}

export type AuthenticateCredentialsOutcome =
  | AuthenticateCredentialsResult
  | AuthenticateCredentialsFailureResult;

export interface RequestPasswordResetResult {
  ok: true;
  message: string;
}

export interface ConfirmPasswordResetSuccess {
  ok: true;
  message: string;
}

export interface ConfirmPasswordResetFailure {
  ok: false;
  errorCode: AuthErrorCode;
}

export type ConfirmPasswordResetResult =
  | ConfirmPasswordResetSuccess
  | ConfirmPasswordResetFailure;

export interface PasswordResetTokenSnapshot {
  token: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PasswordResetTokenValidationResult {
  ok: true;
}

export interface PasswordResetTokenValidationFailure {
  ok: false;
  errorCode: AuthErrorCode;
}

export type PasswordResetTokenValidationOutcome =
  | PasswordResetTokenValidationResult
  | PasswordResetTokenValidationFailure;
