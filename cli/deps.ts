export * as colours from "https://deno.land/std@0.177.0/fmt/colors.ts";
export * as path from "https://deno.land/std@0.177.0/path/mod.ts";
export * as cliffy from "https://deno.land/x/cliffy@v0.25.7/mod.ts";
export { run } from "https://deno.land/x/run_simple@1.1.0/mod.ts";
import { default as debug_module } from "https://deno.land/x/debuglog@v1.0.0/debug.ts";

export const debug_root = debug_module("git-multi-repo");
