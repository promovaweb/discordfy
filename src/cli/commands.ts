/**
 * Root of the command registry.
 *
 * Imports each command from `commands/` and builds the tree. To add a new
 * command, import it and append it to `subcommands`. The order defines the
 * display order in `--help` and in the OpenCLI description.
 */
import { manifest } from "../app/manifest.ts";
import { webhooksCommand } from "./commands/webhooks.ts";
import { sendCommand } from "./commands/send.ts";
import { aboutCommand } from "./commands/about.ts";
import { configCommand } from "./commands/config.ts";
import { credentialsCommand } from "./commands/credentials.ts";
import { mcpCommand } from "./commands/mcp.ts";
import { createSkillCommand } from "./commands/skill.ts";
import { tuiCommand } from "./commands/tui.ts";
import { doctorCommand } from "./commands/doctor.ts";
import { createCompletionCommand } from "./commands/completion.ts";
import type { Command } from "./registry.ts";

export const root: Command = {
  name: manifest.bin,
  description: manifest.description,
  subcommands: [sendCommand, webhooksCommand, tuiCommand, aboutCommand, configCommand, credentialsCommand, mcpCommand, createSkillCommand(() => root), doctorCommand, createCompletionCommand(() => root)],
  examples: [
    `${manifest.bin}`,
    `${manifest.bin} webhooks add deploys`,
    `${manifest.bin} webhooks list`,
    `${manifest.bin} send deploys "Deploy finished" --title "v1.4.0" --color green`,
    `${manifest.bin} mcp`,
    `${manifest.bin} --skill`,
  ],
};
