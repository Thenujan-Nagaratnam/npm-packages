const requiredMajor = 18;
const current = process.versions.node || '0.0.0';
const major = Number(String(current).split('.')[0]);

if (!Number.isFinite(major) || major < requiredMajor) {
  process.stderr.write(
    `api-governance requires Node.js >=${requiredMajor}. Detected: ${current}\n`,
  );
  process.exit(1);
}
