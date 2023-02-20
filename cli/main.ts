import { cliffy, colours, debug_root, run } from "./deps.ts";

type Repo = {
  name: string;
  path: string;
};

const REPOS: Repo[] = [];

async function getGitStatus(path: string, verbose = false) {
  const statusLines = await run("git status --short", { cwd: path, verbose });
  return statusLines;
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
}

const debug = debug_root.extend("main");

await new cliffy.Command()
  .name("git-multi-repo")
  .version("0.1.0")
  .command("status")
  .action(async () => {
    const repoStatuses = await Promise.allSettled(
      REPOS.map(async (repo) => {
        const statusLines = await getGitStatus(repo.path);
        const hasChanges = statusLines.length !== 0;
        return { ...repo, statusLines, hasChanges };
      })
    );

    repoStatuses.forEach((repo) => {
      if (repo.status === "fulfilled") {
        const { name, hasChanges, statusLines } = repo.value;

        const nameOutput = colours.red(name);

        if (hasChanges) {
          console.log(`${nameOutput}:`);
          statusLines.split("\n").forEach((line) => {
            console.log(`  ${line}`);
          });
        } else {
          console.log(`${nameOutput} - ${colours.green("no changes")}`);
        }
      }
    });
  })
  .parse();
