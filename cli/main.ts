import { cliffy, colours, debug_root, path, run } from "./deps.ts";

type Repo = {
  name: string;
  path: string;
};
type Config = {
  repos: Repo[];
};

const CONFIG_FILE_NAME = ".git-multi-repo.json";

const debug = debug_root.extend("main");

async function loadConfig(home: string) {
  const configPath = path.join(home, CONFIG_FILE_NAME);
  const json = await Deno.readTextFile(configPath);
  const config = JSON.parse(json) as Config;
  return config;
}

async function getGitStatus(path: string, verbose = false) {
  const statusLines = await run("git status --short", { cwd: path, verbose });
  return statusLines;
}

async function getGitBranchStatus(path: string, verbose = false) {
  const branchLines = await run("git branch -vv", { cwd: path, verbose });
  const currentBranch = branchLines
    .split("\n")
    .find((line) => line.startsWith("* "));
  if (typeof currentBranch === "undefined") {
    const message = "#m5nOET Failed to find current branch";
    console.error(message);
    console.error(path);
    throw new Error(message);
  }
  const results = currentBranch.match(/\[([^\]]+)]/);
  if (results === null) {
    const message = "#S3XkPT Failed to extract current branch";
    console.error(message);
    console.error(path);
    throw new Error(message);
  }
  const branchInfo = results[0];
  return branchInfo;
}

await new cliffy.Command()
  .name("git-multi-repo")
  .version("0.1.0")
  .globalEnv("HOME=<path:string>", "The user's home directory", {
    required: true,
  })
  .action(function () {
    this.showHelp();
  })
  .command("status")
  .action(async (options) => {
    const config = await loadConfig(options.home);

    const { repos } = config;
    const repoStatuses = await Promise.allSettled(
      repos.map(async (repo) => {
        const statusLines = await getGitStatus(repo.path);
        const branchInfo = await getGitBranchStatus(repo.path);
        const hasChanges = statusLines.length !== 0;
        return { ...repo, statusLines, hasChanges, branchInfo };
      })
    );

    repoStatuses.forEach((repo) => {
      if (repo.status === "fulfilled") {
        const { name, hasChanges, statusLines, branchInfo } = repo.value;

        const nameOutput = colours.magenta(name);
        const branchOutput =
          branchInfo.includes("ahead") || branchInfo.includes("behind")
            ? colours.red(branchInfo)
            : branchInfo;

        if (hasChanges) {
          console.log(
            `${nameOutput} - ${colours.red("has changes")} - ${branchOutput}:`
          );
          statusLines.split("\n").forEach((line) => {
            console.log(`  ${line}`);
          });
        } else {
          console.log(
            `${nameOutput} - ${colours.green("no changes")} - ${branchOutput}`
          );
        }
      }
    });
  })
  .parse();
