"use client";

import { useMemo, useState } from "react";

type UploadResult = {
  ok: true;
  key: string;
  etag?: string;
  url?: string;
};

type UploadError = {
  ok: false;
  error: string;
};

export function R2UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [tokenValue, setTokenValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sizeLabel = useMemo(() => {
    if (!file) return "";
    const kb = file.size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }, [file]);

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
  const uploadUrl = apiBaseUrl ? `${apiBaseUrl}/r2-upload` : "/api/r2-upload";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("Pick a file first.");
      return;
    }

    setSubmitting(true);
    try {
      if (!apiBaseUrl && process.env.NODE_ENV === "production") {
        setError("Missing NEXT_PUBLIC_API_BASE_URL configuration.");
        return;
      }

      const form = new FormData();
      form.set("file", file);
      const headers = new Headers();
      if (tokenValue.trim().length > 0) headers.set("x-upload-token", tokenValue.trim());
      const res = await fetch(uploadUrl, { method: "POST", body: form, headers });
      const json = (await res.json().catch(() => null)) as UploadResult | UploadError | null;
      if (!res.ok || !json || (json as UploadError).ok === false) {
        setError((json as UploadError | null)?.error ?? `Upload failed (${res.status}).`);
        return;
      }
      setResult(json as UploadResult);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
      <p className="text-xs font-medium text-black/60 dark:text-white/60">R2 upload test</p>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Choose a file</span>
          <input
            type="file"
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-black/15 file:bg-black/[0.03] file:px-3 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-black/[0.06] dark:file:border-white/15 dark:file:bg-white/[0.06] dark:file:text-white dark:hover:file:bg-white/[0.12]"
          />
        </label>

        <div className="flex items-center justify-between text-xs text-black/60 dark:text-white/60">
          <span>{file ? `${file.name} (${sizeLabel})` : "No file selected"}</span>
          <span>Max 15 MB</span>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium">Upload token (optional)</span>
          <input
            type="password"
            value={tokenValue}
            onChange={(e) => setTokenValue(e.currentTarget.value)}
            placeholder="R2_UPLOAD_TOKEN"
            className="h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 text-sm text-black placeholder:text-black/40 focus:outline-none dark:border-white/15 dark:text-white dark:placeholder:text-white/40"
          />
          <span className="text-xs text-black/60 dark:text-white/60">
            If `R2_UPLOAD_TOKEN` is set on the server, this must match.
          </span>
        </label>

        <button
          type="submit"
          disabled={!file || submitting}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          {submitting ? "Uploading…" : "Upload to R2"}
        </button>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        {result ? (
          <div className="rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
            <p className="font-medium">Uploaded</p>
            <p className="mt-1 break-all text-black/70 dark:text-white/70">Key: {result.key}</p>
            {result.url ? (
              <p className="mt-1 break-all text-black/70 dark:text-white/70">
                URL:{" "}
                <a className="underline" href={result.url} target="_blank" rel="noreferrer">
                  {result.url}
                </a>
              </p>
            ) : (
              <p className="mt-1 text-black/60 dark:text-white/60">
                Set `R2_PUBLIC_BASE_URL` to return a clickable URL.
              </p>
            )}
          </div>
        ) : null}
      </form>
    </div>
  );
}
