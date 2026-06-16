const views = {
	runtime: {
		nodes: [
			["CLI / RPC / Print", "main.ts 解析参数，选择交互、打印或 RPC 模式。"],
			["AgentSession", "统一会话、模型、工具、压缩、重试和扩展事件。"],
			["Agent Core", "Agent 保存状态，runLoop 驱动模型响应和工具调用。"],
			["pi-ai Providers", "streamSimple 在 LLM 边界调用 OpenAI、Anthropic、Google 等 provider。"],
		],
		title: "运行链路：从用户输入到模型边界",
		points: [
			"用户输入先进入 coding-agent 的模式层，再被包装成 AgentSession 的 prompt。",
			"AgentSession 不直接实现 LLM 协议，它配置 Agent、工具、系统提示词和会话保存。",
			"agent-loop.ts 是主循环：模型流式响应、发现 toolCall、执行工具、把 toolResult 放回上下文。",
		],
	},
	packages: {
		nodes: [
			["pi-ai", "统一多模型 API、stream、消息转换、token 与 provider 差异。"],
			["pi-agent-core", "Agent、AgentLoop、事件、状态、会话树、压缩基础设施。"],
			["pi-coding-agent", "CLI、内置工具、配置、认证、扩展、交互模式。"],
			["pi-tui", "终端组件、渲染树、输入处理和差分绘制。"],
		],
		title: "包边界：底层通用，上层产品化",
		points: [
			"越底层越通用：pi-ai 不关心 coding agent，agent-core 不关心具体 CLI UI。",
			"coding-agent 把 core 组合成可用产品：内置工具、模型选择、资源加载、会话导出。",
			"tui 与业务逻辑分离，主要为 interactive-mode 提供终端界面能力。",
		],
	},
	extension: {
		nodes: [
			["ResourceLoader", "加载 skills、prompts、themes、context、系统提示词。"],
			["ExtensionRunner", "向运行时注入命令、工具、UI 上下文和事件监听。"],
			["Tool Registry", "工具定义、工具实例、来源信息、prompt snippet 分开管理。"],
			["Session Events", "turn_start、tool_execution、compaction、agent_end 驱动扩展响应。"],
		],
		title: "扩展点：围绕事件和资源加载扩展",
		points: [
			"AgentSession 是扩展系统的枢纽，既订阅 core Agent 事件，也向扩展广播 session 事件。",
			"工具不是散落注册的：代码维护 tool definitions、agent tools、来源信息和提示词片段。",
			"skills 与 prompt templates 属于资源层，最终会影响系统提示词或下一次用户输入。",
		],
	},
};

const modules = [
	{
		name: "pi-ai",
		role: "多模型统一层",
		desc: "把 OpenAI、Anthropic、Google、Bedrock、OpenRouter 等 provider 的输入输出统一成 Message、Model、EventStream 和 streamSimple。",
		files: ["packages/ai/src/index.ts", "packages/ai/src/providers/*", "packages/ai/test/*stream*.test.ts"],
	},
	{
		name: "pi-agent-core",
		role: "Agent 核心运行时",
		desc: "保存 AgentState，管理监听器、消息队列、主循环、工具调用、事件流、会话树与压缩基础能力。",
		files: ["packages/agent/src/agent.ts", "packages/agent/src/agent-loop.ts", "packages/agent/src/types.ts"],
	},
	{
		name: "AgentHarness",
		role: "可复用 harness",
		desc: "比 Agent 更接近应用层：把 session repo、skills、prompt templates、环境抽象和压缩组合起来，适合非 CLI 应用复用。",
		files: ["packages/agent/src/harness/agent-harness.ts", "packages/agent/src/harness/session/*"],
	},
	{
		name: "pi-coding-agent",
		role: "产品层 CLI",
		desc: "负责命令行入口、运行模式、配置、模型选择、认证、内置文件工具、扩展系统和终端交互。",
		files: ["packages/coding-agent/src/main.ts", "packages/coding-agent/src/core/agent-session.ts"],
	},
	{
		name: "内置工具",
		role: "文件与命令执行能力",
		desc: "read、bash、edit、write、grep、find、ls 通过 ToolDefinition 和 AgentTool 两层暴露，支持渲染、校验和执行。",
		files: ["packages/coding-agent/src/core/tools/index.ts", "packages/coding-agent/src/core/tools/*.ts"],
	},
	{
		name: "会话系统",
		role: "持久化与分支",
		desc: "SessionManager 与 JSONL/内存存储保存消息树，支持 fork、branch summary、session picker 和 HTML 导出。",
		files: ["packages/coding-agent/src/core/session-manager.ts", "packages/agent/src/harness/session/jsonl-storage.ts"],
	},
	{
		name: "上下文压缩",
		role: "长会话续航",
		desc: "通过 token 估算、cut point、摘要生成和 overflow recovery，避免长上下文爆掉，同时保留文件路径和关键决策。",
		files: ["packages/coding-agent/src/core/compaction/compaction.ts", "packages/agent/src/harness/compaction/compaction.ts"],
	},
	{
		name: "交互 UI",
		role: "终端体验",
		desc: "interactive-mode 使用 pi-tui 组件渲染消息、工具执行、模型选择、设置弹窗、diff 和 footer 状态。",
		files: ["packages/coding-agent/src/modes/interactive/interactive-mode.ts", "packages/tui/src/*"],
	},
];

const codeItems = [
	{
		title: "runLoop",
		topic: "loop",
		path: "packages/agent/src/agent-loop.ts",
		why: "Pi Agent 最核心的执行循环。它处理 pending steering、调用模型、执行工具、准备下一轮，并在没有工具和 follow-up 时停止。",
		read: ["先看外层 while：为什么 agent 停止前还会检查 follow-up。", "再看内层 while：为什么 pending messages 和 tool calls 会共同驱动下一轮。", "最后看 prepareNextTurn 与 shouldStopAfterTurn：这是上层运行时影响 loop 的接口。"],
		snippet: `while (true) {\n  let hasMoreToolCalls = true;\n  while (hasMoreToolCalls || pendingMessages.length > 0) {\n    const message = await streamAssistantResponse(...);\n    const toolCalls = message.content.filter((c) => c.type === "toolCall");\n    if (toolCalls.length > 0) {\n      const batch = await executeToolCalls(...);\n      hasMoreToolCalls = !batch.terminate;\n    }\n  }\n  const followUpMessages = await config.getFollowUpMessages?.();\n}`,
	},
	{
		title: "Agent",
		topic: "state",
		path: "packages/agent/src/agent.ts",
		why: "状态化 wrapper，拥有消息、工具、模型、thinking level、队列、订阅者和 active run。应用层通常使用它，而不是直接调用 runAgentLoop。",
		read: ["看 PendingMessageQueue，理解 steering 与 follow-up 的差异。", "看 subscribe 和状态更新，理解 UI 为什么能实时响应。", "看 streamFn 默认值，理解模型调用边界。"],
		snippet: `export class Agent {\n  private _state: MutableAgentState;\n  private readonly steeringQueue: PendingMessageQueue;\n  private readonly followUpQueue: PendingMessageQueue;\n  public streamFn: StreamFn;\n}`,
	},
	{
		title: "AgentSession",
		topic: "state",
		path: "packages/coding-agent/src/core/agent-session.ts",
		why: "coding-agent 的中心对象。它把 Agent、SessionManager、SettingsManager、ResourceLoader、ModelRegistry 和 ExtensionRunner 绑成一个运行时。",
		read: ["先读文件头注释，确认它跨 interactive、print、rpc 共享。", "看 constructor：订阅 Agent 事件并安装工具 hooks。", "搜索 _handleAgentEvent、_buildRuntime、prompt，串起一次真实执行。"],
		snippet: `export class AgentSession {\n  readonly agent: Agent;\n  readonly sessionManager: SessionManager;\n  readonly settingsManager: SettingsManager;\n  private _toolRegistry: Map<string, AgentTool> = new Map();\n}`,
	},
	{
		title: "工具注册入口",
		topic: "tools",
		path: "packages/coding-agent/src/core/tools/index.ts",
		why: "所有内置工具的统一出口。注意 ToolDefinition 和 Tool 的双轨设计：一个给扩展/描述/渲染，一个给 agent 实际执行。",
		read: ["读 ToolName union，确认内置工具集合。", "比较 createToolDefinition 与 createTool。", "看 createCodingTools 和 createReadOnlyTools，理解不同模式暴露不同能力。"],
		snippet: `export type ToolName = "read" | "bash" | "edit" | "write" | "grep" | "find" | "ls";\n\nexport function createCodingTools(cwd: string, options?: ToolsOptions): Tool[] {\n  return [createReadTool(cwd), createBashTool(cwd), createEditTool(cwd), createWriteTool(cwd)];\n}`,
	},
	{
		title: "main",
		topic: "models",
		path: "packages/coding-agent/src/main.ts",
		why: "CLI 总入口，负责解析参数、读取 stdin、恢复/创建会话、选择运行模式，并创建 AgentSessionRuntime。",
		read: ["看 resolveAppMode：TTY 与参数如何决定模式。", "看 createSessionManager：新会话、恢复、fork 的入口。", "看 main 末尾：interactive、print、rpc 如何分流。"],
		snippet: `export async function main(args: string[], options?: MainOptions) {\n  const parsed = parseArgs(args);\n  const runtimeHost = await createAgentSessionRuntime(...);\n  return runMode(runtimeHost, parsed);\n}`,
	},
	{
		title: "模型注册与认证",
		topic: "models",
		path: "packages/coding-agent/src/core/model-registry.ts",
		why: "把模型列表、provider、API key 或 OAuth 状态组织起来，供 AgentSession 在请求前解析模型和请求认证信息。",
		read: ["搜索 loadModels、getModel、resolve model。", "结合 auth-storage.ts 看凭据如何存取。", "结合 pi-ai provider 测试看 provider 差异怎么被抹平。"],
		snippet: `ModelRegistry -> selected model -> provider auth -> streamSimple options`,
	},
	{
		title: "压缩策略",
		topic: "state",
		path: "packages/coding-agent/src/core/compaction/compaction.ts",
		why: "长会话的关键代码。它估算上下文、寻找安全切点、生成摘要，并在 overflow 时进入恢复流程。",
		read: ["看 shouldCompact 的触发条件。", "看 findCutPoint 如何避免截断不完整 turn。", "看 generateSummary 的 prompt，里面明确要求保留文件路径和函数名。"],
		snippet: `estimateContextTokens -> shouldCompact -> findCutPoint -> generateSummary -> compact`,
	},
	{
		title: "交互模式",
		topic: "ui",
		path: "packages/coding-agent/src/modes/interactive/interactive-mode.ts",
		why: "终端产品体验的入口，连接输入框、消息组件、工具执行渲染、快捷键、选择器和 AgentSession 事件。",
		read: ["先找 runInteractiveMode。", "再看组件如何订阅 session events。", "最后看 footer、selector、diff 等组件如何按事件重绘。"],
		snippet: `interactive-mode -> AgentSession events -> TUI components -> differential rendering`,
	},
];

const route = [
	["先跑起来", "阅读 README 的 Development 部分，执行 npm install、npm run build、./pi-test.sh，建立可调试环境。"],
	["读入口和模式", "从 main.ts 开始，理解参数、stdin、session、interactive/print/rpc 三种模式如何分流。"],
	["读主循环", "精读 agent.ts 与 agent-loop.ts，画出 prompt、assistant、toolCall、toolResult 的消息流。"],
	["读工具和会话", "读 tools/index.ts、read/bash/edit、session-manager.ts、jsonl-storage.ts，理解能力与记忆如何落地。"],
	["读扩展和压缩", "最后读 extensions、skills、prompt-templates、compaction，理解 Pi 如何自扩展和维持长任务。"],
];

const flow = document.querySelector("#flow");
const explain = document.querySelector("#flowExplain");
const moduleGrid = document.querySelector("#moduleGrid");
const moduleSearch = document.querySelector("#moduleSearch");
const codeList = document.querySelector("#codeList");
const codeDetail = document.querySelector("#codeDetail");
const codeFilter = document.querySelector("#codeFilter");
const timeline = document.querySelector("#timeline");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");

function renderView(name) {
	const view = views[name];
	flow.innerHTML = view.nodes.map(([title, body]) => `<div class="node"><strong>${title}</strong><span>${body}</span></div>`).join("");
	explain.innerHTML = `<h3>${view.title}</h3><ul>${view.points.map((point) => `<li>${point}</li>`).join("")}</ul>`;
	document.querySelectorAll("[data-view]").forEach((button) => {
		button.classList.toggle("active", button.dataset.view === name);
	});
}

function renderModules(filter = "") {
	const needle = filter.trim().toLowerCase();
	const visible = modules.filter((item) => {
		const haystack = [item.name, item.role, item.desc, ...item.files].join(" ").toLowerCase();
		return haystack.includes(needle);
	});
	moduleGrid.innerHTML = visible
		.map(
			(item) => `<article class="module-card">
				<h3>${item.name}</h3>
				<p><strong>${item.role}</strong></p>
				<p>${item.desc}</p>
				<div class="tag-row">${item.files.map((file) => `<span class="tag">${file}</span>`).join("")}</div>
			</article>`,
		)
		.join("");
}

function renderCodeList(filter = "all") {
	const visible = codeItems.filter((item) => filter === "all" || item.topic === filter);
	codeList.innerHTML = visible
		.map(
			(item, index) => `<button class="code-item ${index === 0 ? "active" : ""}" type="button" data-title="${item.title}">
				<strong>${item.title}</strong>
				<span>${item.path}</span>
			</button>`,
		)
		.join("");
	renderCodeDetail(visible[0] || codeItems[0]);
}

function renderCodeDetail(item) {
	codeDetail.innerHTML = `<h3>${item.title}</h3>
		<span class="path">${item.path}</span>
		<p>${item.why}</p>
		<h4>阅读抓手</h4>
		<ul>${item.read.map((point) => `<li>${point}</li>`).join("")}</ul>
		<h4>代码形状</h4>
		<pre><code>${escapeHtml(item.snippet)}</code></pre>`;
}

function escapeHtml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderRoute() {
	timeline.innerHTML = route
		.map(
			([title, body], index) => `<label class="step">
				<span class="step-num">${index + 1}</span>
				<span><h3>${title}</h3><p>${body}</p></span>
				<input type="checkbox" data-step="${index}" />
			</label>`,
		)
		.join("");
}

function updateProgress() {
	const checked = timeline.querySelectorAll("input:checked").length;
	progressText.textContent = `${checked} / ${route.length}`;
	progressBar.value = checked;
}

document.querySelectorAll("[data-view]").forEach((button) => {
	button.addEventListener("click", () => renderView(button.dataset.view));
});

moduleSearch.addEventListener("input", () => renderModules(moduleSearch.value));
codeFilter.addEventListener("change", () => renderCodeList(codeFilter.value));
codeList.addEventListener("click", (event) => {
	const button = event.target.closest(".code-item");
	if (!button) return;
	const item = codeItems.find((entry) => entry.title === button.dataset.title);
	if (!item) return;
	document.querySelectorAll(".code-item").forEach((node) => node.classList.remove("active"));
	button.classList.add("active");
	renderCodeDetail(item);
});
timeline.addEventListener("change", updateProgress);

renderView("runtime");
renderModules();
renderCodeList();
renderRoute();
updateProgress();
