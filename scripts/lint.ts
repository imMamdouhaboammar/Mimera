const forbidden = ["TODO", "TBD"];
const roots = ["apps", "packages", "python", "scripts"];

for (const root of roots) {
  const glob = new Bun.Glob("**/*.{ts,py}");
  for await (const relative of glob.scan({ cwd: root, onlyFiles: true })) {
    const path = `${root}/${relative}`;
    const text = await Bun.file(path).text();
    for (const token of forbidden) {
      if (text.includes(token)) {
        console.error(`${path}: contains forbidden placeholder ${token}`);
        process.exitCode = 1;
      }
    }
  }
}
