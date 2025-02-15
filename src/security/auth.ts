// Save as: src/security/auth.ts

import { sign, verify } from 'jsonwebtoken';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { EventEmitter } from 'events';
import { z } from 'zod';

// Types and Interfaces
interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: string[];
  mfaEnabled: boolean;
  lastLogin?: Date;
}

enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

interface AuthToken {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

interface MFAConfig {
  enabled: boolean;
  type: 'totp' | 'sms' | 'email';
  secret?: string;
  verified: boolean;
}

interface LoginAttempt {
  username: string;
  ip: string;
  timestamp: Date;
  success: boolean;
}

// Validation Schemas
const userSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'manager', 'user']),
  mfaEnabled: z.boolean().default(false),
});

// Security Manager
class SecurityManager {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;
  private readonly tokenExpiry: number;
  private readonly refreshExpiry: number;
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;

  private loginAttempts: Map<string, LoginAttempt[]>;
  private blacklistedTokens: Set<string>;

  constructor(
    jwtSecret: string,
    refreshSecret: string,
    config: {
      tokenExpiry?: number;
      refreshExpiry?: number;
      maxLoginAttempts?: number;
      lockoutDuration?: number;
    } = {}
  ) {
    this.jwtSecret = jwtSecret;
    this.refreshSecret = refreshSecret;
    this.tokenExpiry = config.tokenExpiry || 3600; // 1 hour
    this.refreshExpiry = config.refreshExpiry || 2592000; // 30 days
    this.maxLoginAttempts = config.maxLoginAttempts || 5;
    this.lockoutDuration = config.lockoutDuration || 900000; // 15 minutes

    this.loginAttempts = new Map();
    this.blacklistedTokens = new Set();
  }

  generateTokens(user: User): AuthToken {
    const token = sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      },
      this.jwtSecret,
      { expiresIn: this.tokenExpiry }
    );

    const refreshToken = sign(
      { id: user.id },
      this.refreshSecret,
      { expiresIn: this.refreshExpiry }
    );

    return {
      token,
      refreshToken,
      expiresIn: this.tokenExpiry,
    };
  }

  verifyToken(token: string): any {
    if (this.blacklistedTokens.has(token)) {
      throw new Error('Token has been blacklisted');
    }
    return verify(token, this.jwtSecret);
  }

  blacklistToken(token: string): void {
    this.blacklistedTokens.add(token);
  }

  checkLoginAttempts(username: string, ip: string): boolean {
    const attempts = this.loginAttempts.get(username) || [];
    const recentAttempts = attempts.filter(
      attempt => 
        attempt.timestamp.getTime() > Date.now() - this.lockoutDuration
    );

    return recentAttempts.length < this.maxLoginAttempts;
  }

  recordLoginAttempt(username: string, ip: string, success: boolean): void {
    const attempts = this.loginAttempts.get(username) || [];
    attempts.push({
      username,
      ip,
      timestamp: new Date(),
      success,
    });
    this.loginAttempts.set(username, attempts);
  }
}

// MFA Manager
class MFAManager {
  private readonly issuer: string;
  private readonly algorithm: string;
  private readonly digits: number;
  private readonly step: number;

  constructor(
    issuer: string = 'NexusStreamAI',
    config: {
      algorithm?: string;
      digits?: number;
      step?: number;
    } = {}
  ) {
    this.issuer = issuer;
    this.algorithm = config.algorithm || 'sha1';
    this.digits = config.digits || 6;
    this.step = config.step || 30;
  }

  generateSecret(): string {
    return randomBytes(20).toString('hex');
  }

  generateTOTP(secret: string): string {
    const counter = Math.floor(Date.now() / 1000 / this.step);
    return this.generateHOTP(secret, counter);
  }

  verifyTOTP(token: string, secret: string): boolean {
    const counter = Math.floor(Date.now() / 1000 / this.step);
    // Check current and previous window
    return (
      this.verifyHOTP(token, secret, counter) ||
      this.verifyHOTP(token, secret, counter - 1)
    );
  }

  private generateHOTP(secret: string, counter: number): string {
    const buffer = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      buffer[7 - i] = counter & 0xff;
      counter = counter >> 8;
    }

    const hmac = createHash(this.algorithm)
      .update(Buffer.from(secret, 'hex'))
      .update(buffer)
      .digest();

    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (code % Math.pow(10, this.digits)).toString().padStart(this.digits, '0');
  }

  private verifyHOTP(token: string, secret: string, counter: number): boolean {
    const expected = this.generateHOTP(secret, counter);
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }
}

// Rate Limiter
class RateLimiter {
  private readonly limits: Map<string, number[]>;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.limits = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  checkLimit(key: string): boolean {
    const now = Date.now();
    const timestamps = this.limits.get(key) || [];

    // Remove old timestamps
    const validTimestamps = timestamps.filter(
      time => time > now - this.windowMs
    );

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.limits.set(key, validTimestamps);
    return true;
  }

  resetLimit(key: string): void {
    this.limits.delete(key);
  }
}

// Audit Logger
class AuditLogger extends EventEmitter {
  private readonly logs: Array<{
    timestamp: Date;
    action: string;
    user?: string;
    details: any;
  }>;

  constructor() {
    super();
    this.logs = [];
  }

  log(action: string, details: any, user?: string): void {
    const logEntry = {
      timestamp: new Date(),
      action,
      user,
      details,
    };

    this.logs.push(logEntry);
    this.emit('log', logEntry);
  }

  getLogs(
    filter?: {
      action?: string;
      user?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): any[] {
    return this.logs.filter(log => {
      if (filter?.action && log.action !== filter.action) return false;
      if (filter?.user && log.user !== filter.user) return false;
      if (filter?.startDate && log.timestamp < filter.startDate) return false;
      if (filter?.endDate && log.timestamp > filter.endDate) return false;
      return true;
    });
  }
}

// Main Authentication Manager
export class AuthenticationManager {
  private readonly security: SecurityManager;
  private readonly mfa: MFAManager;
  private readonly rateLimiter: RateLimiter;
  private readonly auditLogger: AuditLogger;

  constructor(
    jwtSecret: string,
    refreshSecret: string,
    config: {
      tokenExpiry?: number;
      refreshExpiry?: number;
      maxLoginAttempts?: number;
      lockoutDuration?: number;
      rateLimit?: {
        windowMs?: number;
        maxRequests?: number;
      };
    } = {}
  ) {
    this.security = new SecurityManager(
      jwtSecret,
      refreshSecret,
      {
        tokenExpiry: config.tokenExpiry,
        refreshExpiry: config.refreshExpiry,
        maxLoginAttempts: config.maxLoginAttempts,
        lockoutDuration: config.lockoutDuration,
      }
    );

    this.mfa = new MFAManager();
    this.rateLimiter = new RateLimiter(
      config.rateLimit?.windowMs,
      config.rateLimit?.maxRequests
    );
    this.auditLogger = new AuditLogger();
  }

  async authenticate(
    username: string,
    password: string,
    ip: string,
    mfaToken?: string
  ): Promise<AuthToken> {
    // Check rate limit
    if (!this.rateLimiter.checkLimit(ip)) {
      this.auditLogger.log('rate-limit-exceeded', { ip });
      throw new Error('Rate limit exceeded');
    }

    // Check login attempts
    if (!this.security.checkLoginAttempts(username, ip)) {
      this.auditLogger.log('account-locked', { username, ip });
      throw new Error('Account locked due to too many failed attempts');
    }

    try {
      // Mock user lookup - replace with actual user lookup
      const user: User = {
        id: '1',
        username,
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: ['read'],
        mfaEnabled: true,
      };

      // Verify MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaToken) {
          throw new Error('MFA token required');
        }
        if (!this.mfa.verifyTOTP(mfaToken, 'user-secret')) {
          throw new Error('Invalid MFA token');
        }
      }

      // Generate tokens
      const tokens = this.security.generateTokens(user);

      // Record successful login
      this.security.recordLoginAttempt(username, ip, true);
      this.auditLogger.log('login-success', { username, ip }, user.id);

      return tokens;
    } catch (error) {
      // Record failed login
      this.security.recordLoginAttempt(username, ip, false);
      this.auditLogger.log('login-failed', { username, ip, error: error.message });
      throw error;
    }
  }

  verifyToken(token: string): any {
    return this.security.verifyToken(token);
  }

  logout(token: string): void {
    this.security.blacklistToken(token);
    this.auditLogger.log('logout', { token });
  }

  setupMFA(userId: string): { secret: string; uri: string } {
    const secret = this.mfa.generateSecret();
    // Store secret securely for user
    const uri = `otpauth://totp/NexusStreamAI:${userId}?secret=${secret}&issuer=NexusStreamAI`;
    
    this.auditLogger.log('mfa-setup', { userId });
    return { secret, uri };
  }

  getAuditLogs(filter?: {
    action?: string;
    user?: string;
    startDate?: Date;
    endDate?: Date;
  }): any[] {
    return this.auditLogger.getLogs(filter);
  }
}

// Example usage:
/*
const auth = new AuthenticationManager(
  'jwt-secret',
  'refresh-secret',
  {
    tokenExpiry: 3600,
    maxLoginAttempts: 5,
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100
    }
  }
);

try {
  const tokens = await auth.authenticate('username', 'password', '127.0.0.1', '123456');
  console.log('Authentication successful:', tokens);
} catch (error) {
  console.error('Authentication failed:', error.message);
}
*/
