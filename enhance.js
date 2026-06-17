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

	document.addEventListener("DOMContentLoaded", () => {
		addReadingProgress();
		addCopyButtons();
		addPageSearch();
	});
})();
