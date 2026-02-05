const path = require("path");
const { spawnSync } = require("child_process");

module.exports = async function afterPack(context) {
  if (process.platform !== "darwin") return;
  if (context.electronPlatformName !== "darwin") return;
  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  const xattrResult = spawnSync("xattr", ["-cr", appPath], { stdio: "inherit" });
  if (xattrResult.status !== 0) {
    throw new Error("Failed to clear extended attributes before codesign.");
  }
  const dotClean = spawnSync("dot_clean", ["-m", appPath], { stdio: "inherit" });
  if (dotClean.status !== 0) {
    throw new Error("Failed to remove AppleDouble files before codesign.");
  }
  const findResult = spawnSync("find", [appPath, "-name", "._*", "-delete"], { stdio: "inherit" });
  if (findResult.status !== 0) {
    throw new Error("Failed to delete AppleDouble files before codesign.");
  }
};
