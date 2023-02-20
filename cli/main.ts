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

await new cliffy.Command()
  .name("git-multi-repo")
  .version("0.1.0")
  .globalEnv("HOME=<path:string>", "The user's home directory", {
    required: true,
  })
  .command("status")
  .action(async (options) => {
    const config = await loadConfig(options.home);

    const { repos } = config;
    const repoStatuses = await Promise.allSettled(
      repos.map(async (repo) => {
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
