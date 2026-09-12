import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(repoRoot, "content-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = [];

function fail(message) {
	errors.push(message);
}

function exists(relativePath) {
	return fs.existsSync(path.join(repoRoot, relativePath));
}

function normalize(relativePath) {
	return relativePath.replaceAll("\\", "/");
}

const slugs = new Set();
let pageCount = 0;

for (const module of manifest.modules) {
	const label = `${module.slug}:`;
	const expectedRoot = `modules/${module.slug}/`;
	if (slugs.has(module.slug)) fail(`${label} duplicate module slug`);
	slugs.add(module.slug);

	if (module.root !== expectedRoot) fail(`${label} root must be ${expectedRoot}`);
	if (module.entry !== `${expectedRoot}index.html`) fail(`${label} entry must point to index.html`);
	if (module.charter !== `${expectedRoot}charter.html`) fail(`${label} charter field is missing or incorrect`);

	for (const requiredFile of manifest.moduleConvention.required) {
		const requiredPath = `${expectedRoot}${requiredFile}`;
		if (!exists(requiredPath)) fail(`${label} missing required file ${requiredFile}`);
	}

	const listedPages = new Set(module.pages);
	if (listedPages.size !== module.pages.length) fail(`${label} pages contains duplicate entries`);

	for (const page of module.pages) {
		const pagePath = `${expectedRoot}${page}`;
		pageCount += 1;
		if (!exists(pagePath)) {
			fail(`${label} listed page does not exist: ${page}`);
			continue;
		}
		const html = fs.readFileSync(path.join(repoRoot, pagePath), "utf8");
		const h1Count = (html.match(/<h1\b/gi) || []).length;
		if (h1Count !== 1) fail(`${label} ${page} must contain exactly one h1 (found ${h1Count})`);
	}

	const moduleDir = path.join(repoRoot, expectedRoot);
	if (fs.existsSync(moduleDir)) {
		const diskPages = fs.readdirSync(moduleDir).filter((name) => name.endsWith(".html"));
		for (const page of diskPages) {
			if (!listedPages.has(page)) fail(`${label} ${page} exists on disk but is absent from pages`);
		}
	}

	const indexPath = path.join(repoRoot, module.entry);
	if (fs.existsSync(indexPath)) {
		const indexHtml = fs.readFileSync(indexPath, "utf8");
		if (!/href=["']charter\.html["']/.test(indexHtml)) fail(`${label} index.html must link to charter.html`);
	}
}

for (const commonPage of manifest.commonPages) {
	if (!exists(commonPage)) fail(`common page does not exist: ${commonPage}`);
}

if (errors.length > 0) {
	console.error(`Content structure validation failed with ${errors.length} error(s):`);
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log(`Validated ${manifest.modules.length} modules and ${pageCount} module pages.`);
