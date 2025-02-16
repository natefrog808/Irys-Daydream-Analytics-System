// Save as: src/security/index.ts

import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';
import { authenticator } from 'otplib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import winston from 'winston';

// Security Configuration
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Rate Limiter Configuration
const rateLimiter = new RateLimiterMemory({
  points: 5, // Number of attempts
  duration: 60, // Per 60 seconds
});

// Security Logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Authentication Service
export class AuthenticationService {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;

  constructor(jwtSecret: string, refreshSecret: string) {
    this.jwtSecret = jwtSecret;
    this.refreshSecret = refreshSecret;
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return compare(password, hash);
  }

  generateTokens(userId: string, roles: string[]): {
    token: string;
    refreshToken: string;
  } {
    const token = sign({ userId, roles }, this.jwtSecret, {
      expiresIn: TOKEN_EXPIRY,
    });

    const refreshToken = sign({ userId }, this.refreshSecret, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return { token, refreshToken };
  }

  verifyToken(token: string): any {
    return verify(token, this.jwtSecret);
  }

  verifyRefreshToken(token: string): any {
    return verify(token, this.refreshSecret);
  }

  generateMFASecret(): string {
    return authenticator.generateSecret();
  }

  verifyMFAToken(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}

// Encryption Service
export class EncryptionService {
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(data: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: (cipher as any).getAuthTag().toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      this.key,
      Buffer.from(iv, 'hex')
    );

    (decipher as any).setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// RBAC Service
export class RBACService {
  private roles: Map<string, Set<string>> = new Map();

  addRole(role: string, permissions: string[]) {
    this.roles.set(role, new Set(permissions));
  }

  addPermissionToRole(role: string, permission: string) {
    const rolePermissions = this.roles.get(role);
    if (rolePermissions) {
      rolePermissions.add(permission);
    }
  }

  hasPermission(role: string, permission: string): boolean {
    const rolePermissions = this.roles.get(role);
    return rolePermissions ? rolePermissions.has(permission) : false;
  }
}

// Security Middleware
export const securityMiddleware = {
  async validateToken(req: any, res: any, next: any) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('No token provided');
      }

      const decoded = verify(token, process.env.JWT_SECRET!);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  },

  async rateLimiter(req: any, res: any, next: any) {
    try {
      await rateLimiter.consume(req.ip);
      next();
    } catch {
      res.status(429).json({ error: 'Too many requests' });
    }
  },

  async requirePermission(permission: string) {
    return async (req: any, res: any, next: any) => {
      const userRole = req.user?.role;
      if (!userRole) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const rbac = new RBACService(); // In practice, this would be injected
      if (!rbac.hasPermission(userRole, permission)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    };
  },
};

// Security Utilities
export const securityUtils = {
  validatePassword(password: string): boolean {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChars
    );
  },

  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  },

  logSecurityEvent(event: string, metadata: any) {
    securityLogger.info(event, {
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },
};

// Audit Logger
export class AuditLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'audit-service' },
      transports: [
        new winston.transports.File({ filename: 'logs/audit.log' }),
      ],
    });
  }

  log(action: string, user: string, details: any) {
    this.logger.info({
      action,
      user,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}

// Example usage:
/*
const auth = new AuthenticationService(
  process.env.JWT_SECRET!,
  process.env.REFRESH_SECRET!
);

const encryption = new EncryptionService(process.env.ENCRYPTION_KEY!);

const rbac = new RBACService();
rbac.addRole('admin', ['read', 'write', 'delete']);
rbac.addRole('user', ['read']);

const audit = new AuditLogger();

// Secure API endpoint example
app.post('/api/data',
  securityMiddleware.validateToken,
  securityMiddleware.rateLimiter,
  securityMiddleware.requirePermission('write'),
  async (req, res) => {
    try {
      const sanitizedData = securityUtils.sanitizeInput(req.body.data);
      // Process data...
      audit.log('data_created', req.user.id, { data: sanitizedData });
      res.json({ success: true });
    } catch (error) {
      securityUtils.logSecurityEvent('data_creation_error', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
*/
