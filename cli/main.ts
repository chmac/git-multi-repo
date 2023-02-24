import { cliffy, colours, debug_root, path, run } from "./deps.ts";

type Repo = {
  name: string;
  alias?: string;
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

async function gitPull(path: string, verbose = false) {
  const output = await run("git pull", { cwd: path, verbose });
  const noChanges = output === "Already up to date.";
  return { output, noChanges };
}

/**
Example `git push --porcelain` output looks like:

To github.com:chmac/git-multi-repo.git
=	refs/heads/main:refs/heads/main	[up to date]
Done

Another example looks like:

To github.com:chmac/git-multi-repo.git
 	refs/heads/main:refs/heads/main	e0e4db2..1d6ad1f
Done
*/

async function gitPush(path: string, verbose = false) {
  const output = await run("git push --porcelain", { cwd: path, verbose });
  if (verbose) {
    console.log("#OJbFMQ Git push output");
    console.log(JSON.stringify(output));
  }
  const lines = output.split("\n");
  const pushedLines = lines.filter(
    (line) => !line.startsWith("To ") && !line.startsWith("Done")
  );
  const noChanges = pushedLines.every((line) => line.endsWith("[up to date]"));
  const linesWithoutLastLine = lines.slice(0, lines.length - 1);
  const outputWithoutLastLine = linesWithoutLastLine.join("\n");
  return { output: outputWithoutLastLine, noChanges };
}

function generateNameOutput(repo: Repo): string {
  const { name, alias } = repo;
  const aliasText = typeof alias === "string" ? ` (${alias})` : "";
  const nameOutput = colours.magenta(`${name}${aliasText}`);
  return nameOutput;
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
      if (repo.status === "rejected") {
        console.error("#zub2MQ Internal error");
        console.error(repo.reason);
        return;
      }

      const { hasChanges, statusLines, branchInfo } = repo.value;

      const nameOutput = generateNameOutput(repo.value);

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
    });
  })
  .command("pull")
  .action(async (options) => {
    const config = await loadConfig(options.home);

    const { repos } = config;
    const repoStatuses = await Promise.allSettled(
      repos.map(async (repo) => {
        const pull = await gitPull(repo.path);
        return { ...repo, ...pull };
      })
    );

    repoStatuses.forEach((result) => {
      if (result.status === "rejected") {
        console.error("#t5d1OI Internal error");
        console.error(result.reason);
        return;
      }
      const { noChanges, output } = result.value;
      const nameOutput = generateNameOutput(result.value);
      const pullLabel = noChanges
        ? colours.yellow(output)
        : colours.green("pulled changes");
      const outputIndented = output.split("\n").map((line) => `  ${line}`);
      console.log(`${nameOutput} - ${pullLabel}`);
      if (!noChanges) {
        outputIndented.forEach(console.log);
      }
    });
  })
  .command("push")
  .action(async (options) => {
    const config = await loadConfig(options.home);

    const { repos } = config;
    const repoStatuses = await Promise.allSettled(
      repos.map(async (repo) => {
        const push = await gitPush(repo.path);
        return { ...repo, ...push };
      })
    );

    repoStatuses.forEach((result) => {
      if (result.status === "rejected") {
        console.error("#FU1MPf Internal error");
        console.error(result.reason);
        return;
      }
      const { noChanges, output } = result.value;
      const nameOutput = generateNameOutput(result.value);
      const pullLabel = noChanges
        ? // NOTE: We use `git push --porcelain` because otherwise it doesn't
          // generate any output. So we default to outputting the standard git
          // response for no changes here, even though it's not what we actually
          // get from the git command.
          colours.yellow("Everything up-to-date")
        : colours.green("pushed changes");
      const outputIndented = output.split("\n").map((line) => `  ${line}`);
      console.log(`${nameOutput} - ${pullLabel}`);
      if (!noChanges) {
        outputIndented.forEach((line) => console.log(line));
      }
    });
  })
  .parse();
