import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const contentManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "content-manifest.json"), "utf8"));
const ignoredDirectories = new Set([".git", ".github", ".obsidian", "node_modules", "obsidian-vault", "scripts", "vendor"]);

function walk(dir) {
	const out = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	for (const entry of entries) {
		if (ignoredDirectories.has(entry.name)) continue;
		if (entry.name.startsWith("tmp-")) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else out.push(full);
	}
	return out;
}

function stripHtml(value) {
	return String(value)
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();
}

function inferModule(relativePath) {
	const moduleMatch = relativePath.match(/^modules\/([^/]+)\//);
	if (moduleMatch) return moduleMatch[1];
	if (relativePath.startsWith("examples/")) return "examples";
	return "common";
}

function inferType(relativePath) {
	if (relativePath.startsWith("examples/") && relativePath.endsWith(".html")) return "example";
	if (relativePath.endsWith(".html")) return "page";
	if (relativePath.endsWith(".mjs") || relativePath.endsWith(".js")) return "code";
	return "file";
}

const files = walk(repoRoot).filter((file) => /\.(html|md|mjs)$/.test(file));
const docs = [];

for (const file of files) {
	const relativePath = path.relative(repoRoot, file).replaceAll(path.sep, "/");
	if (relativePath === "search-index.json") continue;

	const raw = fs.readFileSync(file, "utf8");
	if (relativePath.endsWith(".html") && /http-equiv="refresh"/i.test(raw)) continue;

	let title = relativePath;
	if (relativePath.endsWith(".html")) {
		title = raw.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] || raw.match(/<title>(.*?)<\/title>/s)?.[1] || relativePath;
	}

	docs.push({
		id: docs.length + 1,
		title: stripHtml(title),
		url: relativePath,
		module: inferModule(relativePath),
		type: inferType(relativePath),
		text: stripHtml(raw).slice(0, 24000),
	});
}

const payload = {
	count: docs.length,
	modules: [
		...contentManifest.modules.map(({ slug, name }) => ({ slug, name })),
		{ slug: "examples", name: "交互实验" },
		{ slug: "common", name: "公共内容" },
	],
	docs,
};

fs.writeFileSync(path.join(repoRoot, "search-index.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote search-index.json with ${docs.length} documents.`);
