import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User, userIps, users } from "../shared/schema.js";
import pgSession from "connect-pg-simple";
import { pool, db } from "./db.js";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePassword(supplied: string, stored: string) {
  if (!stored || !stored.includes(".")) return false;
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export const MIN_PASSWORD_LENGTH = 12;

export function toPublicUser<T extends Record<string, unknown>>(user: T) {
  const { password, loginCode, ...publicUser } = user;
  return publicUser;
}

function generateAnonUsername(): string {
  return "anon-" + randomBytes(4).toString("hex");
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many accounts created from this IP. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many password reset requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many password change attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !req.isAuthenticated()) {
    return next();
  }

  const origin = req.get("origin");
  const referer = req.get("referer");
  const source = origin || referer;

  // Behind a reverse proxy the Host header may be rewritten; also accept forwarded/public hosts.
  const allowedHosts = new Set<string>();
  const host = req.get("host");
  if (host) allowedHosts.add(host);
  for (const h of (req.get("x-forwarded-host") || "").split(",")) if (h.trim()) allowedHosts.add(h.trim());
  try {
    if (process.env.PUBLIC_APP_URL) allowedHosts.add(new URL(process.env.PUBLIC_APP_URL).host);
  } catch {}

  try {
    if (!source || !allowedHosts.has(new URL(source).host)) {
      console.warn("[auth] origin rejected", { source, allowed: Array.from(allowedHosts) });
      return res.status(403).json({ message: "Invalid request origin" });
    }
  } catch {
    return res.status(403).json({ message: "Invalid request origin" });
  }

  next();
}

function establishSession(
  req: Request,
  user: User,
  next: NextFunction,
  res: Response,
  status: number,
  rememberMe = false,
) {
  req.session.regenerate((sessionError) => {
    if (sessionError) return next(sessionError);
    req.session.cookie.maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      res.status(status).json(toPublicUser(user as unknown as Record<string, unknown>));
    });
  });
}

export function setupAuth(app: Express) {
  const PGStore = pgSession(session);

  let sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production");
  }
  if (!sessionSecret) {
    sessionSecret = randomBytes(32).toString("hex");
    console.warn("[SECURITY] SESSION_SECRET is not configured; using an ephemeral development-only secret.");
  }

  const sessionSettings: session.SessionOptions = {
    name: "uc_session",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PGStore({ pool, createTableIfMissing: false }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    }
  };

  // Replit routes both previews and deployments through one trusted proxy.
  // This lets rate limiting use the forwarded client IP without rejecting
  // login requests because of the X-Forwarded-For header.
  app.set("trust proxy", 1);

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(requireSameOrigin);

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      // If the user row was deleted (DB reset, manual delete, etc.) treat the
      // session as invalid so Passport clears it rather than serving a ghost user.
      if (!user) return done(null, false);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Login — email + password
  app.post("/api/login", loginLimiter, async (req, res, next) => {
    try {
      const { email, password, rememberMe } = req.body;
      if (!email || typeof email !== "string" || !password || typeof password !== "string") {
        console.warn("[security] failed login attempt");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (!user || user.isBanned) {
        console.warn("[security] failed login attempt");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        console.warn("[security] failed login attempt");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      try {
        const ip = req.ip || "unknown";
        await db.insert(userIps).values({ userId: user.id, ip });
      } catch {}
      if (user.role === "admin") console.info(`[security] successful admin login for user ${user.id}`);
      establishSession(req, user, next, res, 200, rememberMe === true);
    } catch (err) {
      next(err);
    }
  });

  // Register — email + password, auto-generate username
  app.post("/api/register", registerLimiter, async (req, res, next) => {
    try {
      const { email, password, agreedToTerms } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email required" });
      }
      if (agreedToTerms !== true) {
        return res.status(400).json({ message: "You must accept the Terms of Service and Privacy Policy" });
      }
      if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      }

      const normalEmail = email.trim().toLowerCase();

      // Check if email already taken. The response remains generic to avoid
      // allowing attackers to enumerate registered accounts.
      const [existing] = await db.select().from(users).where(eq(users.email, normalEmail));
      if (existing) return res.status(400).json({ message: "Unable to create account with these details" });

      const username = generateAnonUsername();
      const hashed = await hashPassword(password);

      const user = await storage.createUser({
        username,
        email: normalEmail,
        password: hashed,
        loginCode: "",
        telegramUsername: "",
        role: "user",
        termsAcceptedAt: new Date(),
      } as any);

      establishSession(req, user, next, res, 201);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Unable to create account with these details" });
      }
      next(err);
    }
  });

  // Password recovery uses one-time, hashed tokens. The configured SMTP sender
  // is used only to deliver reset links; credentials never leave the server.
  app.post("/api/password/forgot", passwordResetLimiter, async (req, res) => {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    try {
      const host = await storage.getSetting("smtp_host", "");
      const port = Number(await storage.getSetting("smtp_port", "587"));
      const sender = await storage.getSetting("smtp_email", "");
      const password = await storage.getSetting("smtp_password", "");
      if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !sender || !password) {
        return res.status(503).json({ message: "Password reset email is not available right now. Please try again later." });
      }

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (user?.password) {
        const rawToken = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");
        await pool.query(
          `DELETE FROM password_reset_tokens
           WHERE user_id = $1 OR expires_at <= NOW() OR consumed_at IS NOT NULL`,
          [user.id],
        );
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
          [user.id, tokenHash],
        );

        const configuredBaseUrl = process.env.PUBLIC_APP_URL?.trim();
        let resetOrigin: string;
        if (configuredBaseUrl) {
          const configuredUrl = new URL(configuredBaseUrl);
          if (!["https:", ...(process.env.NODE_ENV === "production" ? [] : ["http:"])].includes(configuredUrl.protocol)) {
            throw new Error("PUBLIC_APP_URL must use HTTPS");
          }
          resetOrigin = configuredUrl.origin;
        } else if (process.env.NODE_ENV === "production") {
          resetOrigin = "https://spidermarket.at";
        } else {
          const hostHeader = req.get("host");
          if (!hostHeader) throw new Error("Unable to determine password reset host");
          resetOrigin = new URL(`${req.protocol}://${hostHeader}`).origin;
        }
        const resetUrl = new URL(`/reset-password?token=${rawToken}`, resetOrigin).toString();
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user: sender, pass: password },
        });

        try {
          await transporter.sendMail({
            from: `"SpiderCC" <${sender}>`,
            to: user.email,
            subject: "Reset your SpiderCC password",
            text: `We received a request to reset your password. Use this link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
            html: `<p>We received a request to reset your SpiderCC password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
          });
        } catch (mailError) {
          await pool.query("DELETE FROM password_reset_tokens WHERE token_hash = $1", [tokenHash]);
          throw mailError;
        }
      }

      // Do not reveal whether the email address has an account.
      return res.json({ message: "If an account exists for that email, a reset link has been sent." });
    } catch (error) {
      console.error("[auth] password reset request failed:", error instanceof Error ? error.message : error);
      return res.status(503).json({ message: "Password reset email is not available right now. Please try again later." });
    }
  });

  app.post("/api/password/reset", passwordResetLimiter, async (req, res) => {
    const { token, password } = req.body ?? {};
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query<{ user_id: number }>(
        `SELECT user_id
         FROM password_reset_tokens
         WHERE token_hash = $1 AND expires_at > NOW() AND consumed_at IS NULL
         FOR UPDATE`,
        [tokenHash],
      );
      const reset = found.rows[0];
      if (!reset) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "This reset link is invalid or has expired." });
      }

      const hashedPassword = await hashPassword(password);
      await client.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, reset.user_id]);
      await client.query(
        `UPDATE password_reset_tokens
         SET consumed_at = NOW()
         WHERE user_id = $1 AND consumed_at IS NULL`,
        [reset.user_id],
      );
      await client.query("COMMIT");
      return res.json({ message: "Password updated successfully." });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("[auth] password reset failed:", error instanceof Error ? error.message : error);
      return res.status(500).json({ message: "Unable to update your password right now." });
    } finally {
      client.release();
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyError) => {
        if (destroyError) return next(destroyError);
        res.clearCookie("uc_session");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(toPublicUser(req.user as unknown as Record<string, unknown>));
  });
}
