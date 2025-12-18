export async function readResponseBody(res) {
  const text = await res.text();
  if (!text) return { text: "", json: null };
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

export function formatHttpError(prefix, res, body) {
  const snippet =
    body?.json?.message ||
    body?.json?.error ||
    (typeof body?.text === "string" ? body.text.slice(0, 800) : "");

  const msg = snippet ? `${prefix} ${res.status}: ${snippet}` : `${prefix} ${res.status}`;
  const err = new Error(msg);
  err.name = "HttpError";
  return err;
}

