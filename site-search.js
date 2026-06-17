(function () {
	const moduleLabels = {
		"pi-agent": "Pi Agent",
		"mini-agent": "Mini Agent",
		cesium: "Cesium",
		openlayers: "OpenLayers",
		common: "公共页",
	};

	const state = {
		docs: [],
		index: null,
		filter: "all",
	};

	function normalize(value) {
		return String(value || "").toLowerCase().trim();
	}

	function escapeHtml(value) {
		return String(value || "")
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;");
	}

	function snippet(text, query) {
		const clean = String(text || "").replace(/\s+/g, " ").trim();
		const q = normalize(query);
		const pos = q ? clean.toLowerCase().indexOf(q) : -1;
		const start = pos >= 0 ? Math.max(0, pos - 80) : 0;
		const part = clean.slice(start, start + 210);
		return `${start > 0 ? "..." : ""}${part}${start + part.length < clean.length ? "..." : ""}`;
	}

	function buildLunr(docs) {
		if (!window.lunr) return null;
		return window.lunr(function () {
			this.ref("id");
			this.field("title", { boost: 6 });
			this.field("url", { boost: 4 });
			this.field("module", { boost: 3 });
			this.field("text");
			docs.forEach((doc) => this.add(doc));
		});
	}

	function runSearch(query) {
		const q = normalize(query);
		if (!q) return [];
		const byId = new Map();
		if (state.index) {
			try {
				state.index.search(`${q} ${q}*`).forEach((hit) => {
					byId.set(Number(hit.ref), hit.score);
				});
			} catch (_error) {
				try {
					state.index.search(q).forEach((hit) => byId.set(Number(hit.ref), hit.score));
				} catch (_ignored) {}
			}
		}
		state.docs.forEach((doc) => {
			const haystack = normalize(`${doc.title} ${doc.url} ${doc.module} ${doc.text}`);
			if (haystack.includes(q)) {
				byId.set(doc.id, Math.max(byId.get(doc.id) || 0, 100));
			}
		});
		return Array.from(byId.entries())
			.map(([id, score]) => ({ doc: state.docs.find((item) => item.id === id), score }))
			.filter((item) => item.doc && (state.filter === "all" || item.doc.module === state.filter))
			.sort((a, b) => b.score - a.score)
			.slice(0, 30);
	}

	function render(query) {
		const panel = document.querySelector("[data-site-search]");
		if (!panel) return;
		const resultsEl = panel.querySelector("[data-search-results]");
		const statusEl = panel.querySelector("[data-search-status]");
		const results = runSearch(query);
		if (!normalize(query)) {
			statusEl.textContent = `已加载 ${state.docs.length} 条内容。输入关键词开始搜索。`;
			resultsEl.innerHTML = "";
			return;
		}
		statusEl.textContent = `找到 ${results.length} 条结果。`;
		resultsEl.innerHTML = results
			.map(({ doc }) => {
				const label = moduleLabels[doc.module] || doc.module;
				return `<a class="search-result-card" href="../${escapeHtml(doc.url)}">
					<span>${escapeHtml(label)} · ${escapeHtml(doc.type)}</span>
					<strong>${escapeHtml(doc.title)}</strong>
					<small>${escapeHtml(doc.url)}</small>
					<p>${escapeHtml(snippet(doc.text, query))}</p>
				</a>`;
			})
			.join("");
	}

	async function init() {
		const panel = document.querySelector("[data-site-search]");
		if (!panel) return;
		const input = panel.querySelector("[data-search-input]");
		const statusEl = panel.querySelector("[data-search-status]");
		try {
			const response = await fetch("../search-index.json", { cache: "no-cache" });
			const payload = await response.json();
			state.docs = payload.docs || [];
			state.index = buildLunr(state.docs);
			render("");
		} catch (error) {
			statusEl.textContent = `索引加载失败：${error.message}`;
		}
		panel.querySelectorAll("[data-module-filter]").forEach((button) => {
			button.addEventListener("click", () => {
				state.filter = button.dataset.moduleFilter;
				panel.querySelectorAll("[data-module-filter]").forEach((item) => {
					item.classList.toggle("active", item === button);
				});
				render(input.value);
			});
		});
		input.addEventListener("input", () => render(input.value));
	}

	document.addEventListener("DOMContentLoaded", init);
})();
