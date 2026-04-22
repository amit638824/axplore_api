const { spawnSync } = require("child_process");
const path = require("path");

function hasFfmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return r.status === 0;
}

/**
 * Generate a small GIF preview for a video using ffmpeg (if installed).
 * Returns absolute path to the generated gif, or null when ffmpeg not available.
 */
function generateGifPreview(videoAbsPath, { seconds = 3, width = 320 } = {}) {
  if (!hasFfmpeg()) return null;

  const dir = path.dirname(videoAbsPath);
  const base = path.basename(videoAbsPath, path.extname(videoAbsPath));
  const out = path.join(dir, `${base}-preview.gif`);

  const args = [
    "-y",
    "-i",
    videoAbsPath,
    "-t",
    String(seconds),
    "-vf",
    `fps=10,scale=${width}:-1:flags=lanczos`,
    out,
  ];

  const r = spawnSync("ffmpeg", args, { stdio: "ignore" });
  if (r.status !== 0) return null;
  return out;
}

module.exports = {
  hasFfmpeg,
  generateGifPreview,
};

