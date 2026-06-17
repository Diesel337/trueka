import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const standaloneDir = join(".next", "standalone");

copyIfExists("public", join(standaloneDir, "public"));
copyIfExists(join(".next", "static"), join(standaloneDir, ".next", "static"));

function copyIfExists(source, destination) {
  if (!existsSync(source)) {
    return;
  }

  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}
