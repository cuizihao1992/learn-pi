import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([".git", ".obsidian", "node_modules", "obsidian-vault"]);
const failures = [];
let checkedLinks = 0;

function walk(dir) {
	const files = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (ignoredDirectories.has(entry.name) || entry.name.startsWith("tmp-")) continue;
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...walk(fullPath));
		else if (entry.name.endsWith(".html")) files.push(fullPath);
	}
	return files;
}

function resolveTarget(sourceFile, rawTarget) {
	const withoutQuery = rawTarget.split("?")[0];
	const [pathname] = withoutQuery.split("#");
	if (!pathname) return null;
	let decodedPath;
	try {
		decodedPath = decodeURIComponent(pathname);
	} catch (_error) {
		failures.push(`${relative(sourceFile)} -> invalid URL encoding: ${rawTarget}`);
		return null;
	}

	if (decodedPath.startsWith("/learn-pi/")) {
		return path.join(repoRoot, decodedPath.slice("/learn-pi/".length));
	}
	if (decodedPath.startsWith("/")) return path.join(repoRoot, decodedPath.slice(1));
	return path.resolve(path.dirname(sourceFile), decodedPath);
}

function relative(file) {
	return path.relative(repoRoot, file).replaceAll(path.sep, "/");
}

for (const htmlFile of walk(repoRoot)) {
	const html = fs.readFileSync(htmlFile, "utf8");
	const attributes = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);
	for (const match of attributes) {
		const target = match[1].trim();
		if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(target) || target.startsWith("#")) continue;
		const resolved = resolveTarget(htmlFile, target);
		if (!resolved) continue;
		checkedLinks += 1;
		const candidate = resolved.endsWith(path.sep) ? path.join(resolved, "index.html") : resolved;
		if (!fs.existsSync(candidate)) failures.push(`${relative(htmlFile)} -> ${target}`);
	}
}

if (failures.length > 0) {
	console.error(`Link validation failed with ${failures.length} broken local reference(s):`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Validated ${checkedLinks} local links and assets.`);
