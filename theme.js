(function () {
	const themes = ["paper", "ocean", "graphite", "mint", "rose"];
	const labels = {
		paper: "纸本",
		ocean: "海蓝",
		graphite: "石墨",
		mint: "青绿",
		rose: "玫瑰",
	};

	function applyTheme(theme) {
		const safeTheme = themes.includes(theme) ? theme : "paper";
		document.documentElement.dataset.theme = safeTheme;
		localStorage.setItem("learn-pi-theme", safeTheme);
		document.querySelectorAll("[data-theme-choice]").forEach((button) => {
			button.classList.toggle("active", button.dataset.themeChoice === safeTheme);
		});
	}

	function mountSwitcher() {
		const header = document.querySelector(".topbar");
		if (!header || document.querySelector(".theme-switcher")) return;
		const switcher = document.createElement("div");
		switcher.className = "theme-switcher";
		switcher.setAttribute("aria-label", "主题切换");
		switcher.innerHTML = themes
			.map((theme) => `<button type="button" data-theme-choice="${theme}" title="${labels[theme]}主题"><span></span>${labels[theme]}</button>`)
			.join("");
		header.appendChild(switcher);
		switcher.addEventListener("click", (event) => {
			const button = event.target.closest("[data-theme-choice]");
			if (!button) return;
			applyTheme(button.dataset.themeChoice);
		});
	}

	document.addEventListener("DOMContentLoaded", () => {
		mountSwitcher();
		applyTheme(localStorage.getItem("learn-pi-theme") || "paper");
	});
})();
