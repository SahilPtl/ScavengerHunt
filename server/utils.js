export const fail = (status, message) =>
  Object.assign(new Error(message), { status });
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export const ok = (res, data) => res.json({ success: true, data });
export function integer(v) {
  if (
    !/^\d+$/.test(String(v)) ||
    !Number.isSafeInteger(Number(v)) ||
    Number(v) < 1
  )
    throw fail(400, "Invalid identifier");
  return Number(v);
}
export function coordinates(body) {
  const { latitude, longitude } = body;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    throw fail(400, "Valid latitude and longitude are required");
  return { latitude, longitude };
}
export function distance(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
