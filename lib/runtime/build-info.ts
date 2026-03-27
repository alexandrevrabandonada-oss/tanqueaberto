export type BuildEnvironment = "production" | "preview" | "development" | "local";

export interface BuildInfo {
  env: BuildEnvironment;
  sha: string;
  ref: string;
  label: string;
}

function readEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

export function getBuildInfo(): BuildInfo {
  const vercelEnv = readEnv("VERCEL_ENV");
  const env: BuildEnvironment =
    vercelEnv === "production"
      ? "production"
      : vercelEnv === "preview"
        ? "preview"
        : process.env.NODE_ENV === "development"
          ? "development"
          : "local";

  const sha = readEnv("VERCEL_GIT_COMMIT_SHA") || readEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA") || readEnv("GITHUB_SHA") || "local";
  const ref = readEnv("VERCEL_GIT_COMMIT_REF") || readEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF") || readEnv("GITHUB_REF_NAME");

  const shortSha = sha.slice(0, 8);
  const labelParts = [env, ref || null, shortSha];

  return {
    env,
    sha: shortSha,
    ref,
    label: labelParts.filter(Boolean).join(" · ")
  };
}
