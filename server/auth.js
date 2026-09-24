import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { pool } from "./database/db.js";
import { config } from "./config.js";
import { fail, wrap, ok } from "./utils.js";
export const auth = wrap(async (req, res, next) => {
  let payload;
  try {
    payload = jwt.verify(
      req.headers.authorization?.replace(/^Bearer /, ""),
      config.secret,
      { algorithms: ["HS256"], issuer: "campus-hunt" },
    );
  } catch {
    throw fail(401, "Please log in again");
  }
  req.user = (
    await pool.query(
      "SELECT id,name,role,simulated,demo_account FROM users WHERE id=$1",
      [payload.sub],
    )
  ).rows[0];
  if (
    !req.user ||
    req.user.simulated ||
    (!config.demo && req.user.demo_account)
  )
    throw fail(401, "Account unavailable");
  next();
});
export function demo(req, res, next) {
  if (!config.demo) return next(fail(403, "Local demo controls are disabled"));
  next();
}
export function organizer(req, res, next) {
  if (req.user.role !== "organizer")
    return next(fail(403, "Organizer access required"));
  next();
}
const router = Router();
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many attempts; try again in a minute",
    },
  }),
);
function credentials(body) {
  const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    password = body.password;
  if (
    !email ||
    email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    typeof password !== "string" ||
    password.length < 6 ||
    Buffer.byteLength(password) > 72
  )
    throw fail(400, "Enter a valid email and password (6–72 bytes)");
  return { email, password };
}
function session(user) {
  return {
    token: jwt.sign({}, config.secret, {
      subject: String(user.id),
      issuer: "campus-hunt",
      expiresIn: "8h",
    }),
    user: { id: user.id, name: user.name, role: user.role },
  };
}
router.post(
  "/register",
  wrap(async (req, res) => {
    const { email, password } = credentials(req.body);
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 60)
      throw fail(400, "Name must contain 1–60 characters");
    const {
      rows: [user],
    } = await pool.query(
      "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,role",
      [name, email, await bcrypt.hash(password, 12)],
    );
    res.status(201);
    ok(res, session(user));
  }),
);
router.post(
  "/login",
  wrap(async (req, res) => {
    const { email, password } = credentials(req.body);
    const {
      rows: [user],
    } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (
      !user ||
      user.simulated ||
      (!config.demo && user.demo_account) ||
      !(await bcrypt.compare(password, user.password_hash))
    )
      throw fail(401, "Email or password is incorrect");
    ok(res, session(user));
  }),
);
router.get("/me", auth, (req, res) => ok(res, req.user));
export default router;
