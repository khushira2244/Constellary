import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { loadEnv } from "vite";

const projectRoot = process.cwd();
const environment = {
  ...process.env,
  ...loadEnv("test", projectRoot, ""),
  DO_NOT_TRACK: "1",
  SUPABASE_TELEMETRY_ENABLED: "false",
};

const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const name of requiredVariables) {
  if (!environment[name]) {
    console.error(`Missing ${name}. Add it to .env.local before running local integration tests.`);
    process.exit(1);
  }
}

const supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);
if (!["127.0.0.1", "localhost", "::1"].includes(supabaseUrl.hostname)) {
  console.error(
    `Refusing destructive integration reset for non-local Supabase URL: ${supabaseUrl.origin}`,
  );
  process.exit(1);
}

const supabaseExecutable = environment.SUPABASE_CLI_PATH || "supabase";
const isWindows = process.platform === "win32";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
    shell: isWindows,
  });

  if (result.error) {
    console.error(`Could not start ${command}: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}

function resetLocalDatabase(stage) {
  console.warn(`\n[local integration] ${stage}: resetting the LOCAL Supabase database.`);
  return run(supabaseExecutable, ["db", "reset"]);
}

console.warn(
  [
    "",
    "==============================================================",
    "DESTRUCTIVE LOCAL INTEGRATION TEST",
    `Target: ${supabaseUrl.origin}`,
    "This command resets ONLY the local Supabase stack before and",
    "after the test. All local database/Auth test data is removed.",
    "==============================================================",
    "",
  ].join("\n"),
);

let exitCode = 1;

try {
  const resetBefore = resetLocalDatabase("before test");
  if (resetBefore !== 0) {
    console.error("Initial local Supabase reset failed; integration test was not started.");
    exitCode = resetBefore;
  } else {
    exitCode = run(process.execPath, [
      path.join(projectRoot, "node_modules", "vitest", "vitest.mjs"),
      "run",
      "--config",
      "vitest.integration.config.ts",
    ]);
  }
} finally {
  const resetAfter = resetLocalDatabase("after test");
  if (resetAfter !== 0) {
    console.error("Final local Supabase reset failed. Manual `supabase db reset` is required.");
    exitCode = resetAfter;
  }
}

process.exit(exitCode);
