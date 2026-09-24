import jwt from "jsonwebtoken";
import { config } from "./config.js";
export function session(user) {
  return {
    token: jwt.sign({}, config.secret, {
      subject: String(user.id),
      issuer: "campus-hunt",
      expiresIn: "8h",
    }),
    user: { id: user.id, name: user.name, role: user.role },
  };
}
