(function () {
	function addReadingProgress() {
		if (document.querySelector(".reading-progress")) return;
		const bar = document.createElement("div");
		bar.className = "reading-progress";
		bar.innerHTML = "<span></span>";
		document.body.prepend(bar);
		const fill = bar.querySelector("span");
		function update() {
			const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
			const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
			const ratio = height <= 0 ? 0 : Math.min(1, scrollTop / height);
			fill.style.width = `${Math.round(ratio * 100)}%`;
		}
		document.addEventListener("scroll", update, { passive: true });
		update();
	}

	function addCopyButtons() {
		document.querySelectorAll("pre").forEach((pre) => {
			if (pre.querySelector(".copy-code")) return;
			const button = document.createElement("button");
			button.className = "copy-code";
			button.type = "button";
			button.textContent = "复制";
			button.addEventListener("click", async () => {
				const code = pre.querySelector("code")?.innerText || pre.innerText;
				await navigator.clipboard.writeText(code.replace(/^复制\s*/, ""));
				button.textContent = "已复制";
				window.setTimeout(() => {
					button.textContent = "复制";
				}, 1400);
			});
			pre.appendChild(button);
		});
	}

	function addPageSearch() {
		const doc = document.querySelector(".doc");
		if (!doc || document.querySelector(".page-search")) return;
		const wrapper = document.createElement("div");
		wrapper.className = "page-search";
		wrapper.innerHTML = '<input type="search" placeholder="在本页搜索关键词..." aria-label="在本页搜索" /><span></span>';
		doc.insertBefore(wrapper, doc.firstElementChild);
		const input = wrapper.querySelector("input");
		const status = wrapper.querySelector("span");
		const sections = Array.from(doc.querySelectorAll("h2, h3, p, li"));
		input.addEventListener("input", () => {
			const q = input.value.trim().toLowerCase();
			let hits = 0;
			sections.forEach((node) => {
				const match = q && node.textContent.toLowerCase().includes(q);
				node.classList.toggle("search-hit", Boolean(match));
				if (match) hits += 1;
			});
			status.textContent = q ? `${hits} 处匹配` : "";
		});
	}

	function addLearningProgressTracker() {
		const root = document.querySelector("[data-progress-tracker]");
		if (!root || root.dataset.progressReady) return;
		root.dataset.progressReady = "true";

		const storageKey = "learn-pi-progress-v1";
		const levels = [
			{ value: "none", label: "未开始" },
			{ value: "seen", label: "看过" },
			{ value: "explain", label: "说清" },
			{ value: "map", label: "画出" },
			{ value: "done", label: "做成" }
		];
		const items = Array.from(root.querySelectorAll("h2 + ul li, h2 + ul + ul li"));
		const totalEl = root.querySelector("[data-progress-total]");
		const startedEl = root.querySelector("[data-progress-started]");
		const doneEl = root.querySelector("[data-progress-done]");
		const rateEl = root.querySelector("[data-progress-rate]");
		const resetButton = root.querySelector("[data-progress-reset]");

		function load() {
			try {
				return JSON.parse(localStorage.getItem(storageKey)) || {};
			} catch {
				return {};
			}
		}

		function save(state) {
			localStorage.setItem(storageKey, JSON.stringify(state));
		}

		function itemKey(item, index) {
			const section = item.closest("ul")?.previousElementSibling?.textContent?.trim() || "progress";
			return `${section}:${index}:${item.textContent.trim()}`;
		}

		function renderSummary(state) {
			const values = items.map((item, index) => state[itemKey(item, index)] || "none");
			const started = values.filter((value) => value !== "none").length;
			const done = values.filter((value) => value === "done").length;
			const rate = values.length ? Math.round((done / values.length) * 100) : 0;
			if (totalEl) totalEl.textContent = String(values.length);
			if (startedEl) startedEl.textContent = String(started);
			if (doneEl) doneEl.textContent = String(done);
			if (rateEl) rateEl.textContent = `${rate}%`;
		}

		function setItemLevel(item, value) {
			item.dataset.progressLevel = value;
			item.querySelectorAll("[data-progress-level]").forEach((button) => {
				button.classList.toggle("active", button.dataset.progressLevel === value);
			});
		}

		let state = load();
		items.forEach((item, index) => {
			const key = itemKey(item, index);
			const text = item.innerHTML;
			const controls = document.createElement("div");
			controls.className = "progress-levels";
			controls.setAttribute("aria-label", "掌握状态");
			controls.innerHTML = levels
				.map((level) => `<button type="button" data-progress-level="${level.value}">${level.label}</button>`)
				.join("");
			item.innerHTML = `<span class="progress-item-text">${text}</span>`;
			item.appendChild(controls);
			setItemLevel(item, state[key] || "none");
			controls.addEventListener("click", (event) => {
				const button = event.target.closest("[data-progress-level]");
				if (!button) return;
				state[key] = button.dataset.progressLevel;
				save(state);
				setItemLevel(item, state[key]);
				renderSummary(state);
			});
		});

		resetButton?.addEventListener("click", () => {
			state = {};
			save(state);
			items.forEach((item) => setItemLevel(item, "none"));
			renderSummary(state);
		});

		renderSummary(state);
	}

	document.addEventListener("DOMContentLoaded", () => {
		addReadingProgress();
		addCopyButtons();
		addPageSearch();
		addLearningProgressTracker();
	});
})();
