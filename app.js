const views = {
	runtime: {
		nodes: [
			["入口层", "main.ts 解析参数、stdin、session 参数，选择 interactive、print 或 rpc 模式。"],
			["会话运行时", "AgentSessionRuntime 与 AgentSession 组装模型、设置、资源、工具和扩展。"],
			["Agent 核心", "Agent 保存状态和队列，runLoop 驱动模型响应、工具调用和下一轮。"],
			["模型边界", "pi-ai 的 streamSimple 抹平 provider 差异，把响应转成统一事件。"],
		],
		title: "运行链路：产品层把请求送进通用 Agent loop",
		points: [
			"coding-agent 负责产品能力：命令行、配置、模型选择、认证、工具、UI 和会话管理。",
			"agent-core 负责通用循环：消息上下文、事件流、工具调用、停止条件和 follow-up 队列。",
			"pi-ai 是唯一直接理解 provider 差异的层，Agent loop 只处理统一后的 Message 与 EventStream。",
			"关键阅读顺序：main.ts -> agent-session-runtime.ts -> agent-session.ts -> agent.ts -> agent-loop.ts。",
		],
	},
	packages: {
		nodes: [
			["pi-ai", "多 provider LLM API，处理模型、消息、工具 schema、stream、token、缓存和认证细节。"],
			["pi-agent-core", "Agent、AgentLoop、AgentHarness、session repo、compaction、skills、prompt templates。"],
			["pi-coding-agent", "CLI 产品层：内置工具、模型注册、设置、扩展、交互模式、HTML 导出。"],
			["pi-tui", "终端 UI 库：组件树、输入、布局、差分渲染，为 interactive-mode 服务。"],
		],
		title: "包边界：底层抽象稳定，上层组合产品体验",
		points: [
			"pi-ai 不知道 coding agent，它只负责把不同模型 API 变成统一流式接口。",
			"pi-agent-core 不绑定终端，它提供 Agent 和 Harness，适合其他应用复用。",
			"pi-coding-agent 是最值得业务学习的层，具体工具、命令、扩展和 UI 都在这里。",
			"pi-tui 是表现层，阅读它可以理解终端界面为什么能像应用一样更新。",
		],
	},
	extension: {
		nodes: [
			["ResourceLoader", "加载 skills、prompt templates、themes、context files 和 system prompt 片段。"],
			["ExtensionRunner", "把扩展注册的命令、工具、事件监听器和 UI 上下文接入会话。"],
			["Tool Registry", "维护 ToolDefinition、AgentTool、sourceInfo、prompt snippets 和 guidelines。"],
			["Session Events", "turn、message、tool、compaction、retry、agent_end 等事件驱动扩展和 UI。"],
		],
		title: "扩展点：资源加载加事件系统",
		points: [
			"AgentSession 是扩展系统中枢：它监听 core Agent 事件，也把更高层 session 事件广播出去。",
			"工具分两种形态：ToolDefinition 用于描述、渲染和扩展管理；AgentTool 用于实际执行。",
			"skills 和 prompt templates 不是直接执行代码，而是通过系统提示词或用户输入影响模型行为。",
			"读扩展系统时要同时看 extensions/、resource-loader.ts、skills.ts、prompt-templates.ts。",
		],
	},
};

const sequence = [
	["1. 解析启动参数", "packages/coding-agent/src/main.ts", "读取命令行参数、stdin、session/fork 选项，决定进入 interactive、print 或 rpc。"],
	["2. 创建运行时服务", "core/agent-session-services.ts", "加载 SettingsManager、ModelRegistry、ResourceLoader、SessionManager、认证存储和扩展配置。"],
	["3. 创建 AgentSession", "core/agent-session.ts", "订阅 Agent 事件，构建工具注册表，生成系统提示词，准备扩展 runner。"],
	["4. 接收用户 prompt", "AgentSession.prompt()", "处理图片、prompt template、streaming 行为、steering/follow-up 队列和预检。"],
	["5. 进入 Agent.run", "packages/agent/src/agent.ts", "构造 AgentLoopConfig，把 streamFn、工具 hooks、队列读取函数传给 runAgentLoop。"],
	["6. 调用模型", "packages/agent/src/agent-loop.ts", "streamAssistantResponse 把上下文转换给 pi-ai，边接收边 emit message_update。"],
	["7. 执行工具", "executeToolCalls()", "校验工具参数，按 parallel/sequential 策略执行 read/bash/edit/write 等工具。"],
	["8. 写回上下文", "ToolResultMessage", "工具结果变成 toolResult message 放回 messages，驱动模型下一轮继续推理。"],
	["9. 会话保存和压缩", "SessionManager + compaction", "message_end、turn_end、agent_end 被 AgentSession 捕获，用于持久化、自动压缩和重试。"],
];

const exampleViews = {
	overview: {
		title: "示例任务：让 Pi 修改 README 并验证",
		intro: "假设用户在仓库根目录输入：帮我在 README 里增加安装说明，然后运行测试确认没有问题。Pi Agent 会把这句话变成一组 AgentMessage，拼上系统提示词、工具定义和历史上下文，发送给模型。模型不会直接改文件，而是返回 toolCall；Pi 执行工具，把 toolResult 再发回模型，直到模型给出最终回答。",
		steps: [
			["用户输入", "原始文本进入 AgentSession.prompt()。"],
			["上下文组装", "系统提示词、技能、工具说明、会话历史、当前用户消息被组装。"],
			["模型推理", "pi-ai 调用 provider，模型决定先 read README。"],
			["工具执行", "Pi 执行 read/edit/bash，把结果作为 toolResult 写回上下文。"],
			["前端更新", "每个阶段都 emit event，interactive-mode 把事件渲染到终端 UI。"],
		],
		code: `用户: 帮我在 README 里增加安装说明，然后运行测试确认没有问题\n\nPi -> 模型: system prompt + tools + history + user message\n模型 -> Pi: toolCall(read, { path: "README.md" })\nPi -> 模型: toolResult(read, "...README 内容...")\n模型 -> Pi: toolCall(edit, { path: "README.md", edits: [...] })\nPi -> 模型: toolResult(edit, "已修改 + diff")\n模型 -> Pi: toolCall(bash, { command: "npm test" })\nPi -> 模型: toolResult(bash, "测试输出")\n模型 -> 用户: 已完成，README 已更新，测试通过/失败原因如下`,
	},
	prompt: {
		title: "原始提示词会经历哪些处理",
		intro: "用户原始提示词不会原封不动直接扔给模型。它先进入 coding-agent 的应用层：可能展开 prompt template，附加图片，处理 streaming 行为，插入 pending aside/context，然后包装成 AgentMessage。",
		steps: [
			["读取输入", "interactive-mode、print-mode 或 rpc-mode 收到文本。"],
			["展开模板", "如果输入触发 prompt template，expandPromptTemplate 会把命令参数替换进模板。"],
			["处理附件", "图片会变成 ImageContent，和文本一起作为 user message content。"],
			["队列策略", "如果 Agent 正在运行，新输入会按 steer 或 followUp 放入不同队列。"],
			["生成消息", "最终形成 role=user 的 AgentMessage，再由 Agent loop emit message_start/message_end。"],
		],
		code: `原始输入:\n"帮我在 README 里增加安装说明，然后运行测试确认没有问题"\n\n应用层处理后大致变成:\n{\n  role: "user",\n  content: "帮我在 README 里增加安装说明，然后运行测试确认没有问题",\n  images: [],\n  source: "interactive"\n}\n\n注意: 真正发给模型前，还会拼接 system prompt、工具 schema、历史消息和可能的 summary message。`,
	},
	model: {
		title: "发给大模型的不是只有用户一句话",
		intro: "模型看到的是一个完整上下文：系统提示词告诉它身份、约束、工具使用方式；历史消息提供上下文；工具 schema 告诉它能调用 read/bash/edit/write 等工具；当前用户消息只是其中最后一块。",
		steps: [
			["system prompt", "由 buildSystemPrompt 生成，包含行为规则、工具说明、skills、项目上下文。"],
			["历史消息", "Agent.state.messages 里的 user/assistant/toolResult 会转换成 LLM Message。"],
			["压缩摘要", "长会话中旧历史可能被 summary message 替代。"],
			["工具 schema", "read/bash/edit 等工具以模型可理解的 schema 传入 provider。"],
			["provider 适配", "pi-ai 根据 OpenAI/Anthropic/Google 等 provider 转换格式。"],
		],
		code: `发送给模型的逻辑形状:\n[\n  { role: "system", content: "你是 Pi coding agent...工具规则...项目上下文..." },\n  { role: "user", content: "之前的问题..." },\n  { role: "assistant", content: "之前的回答或 toolCall..." },\n  { role: "toolResult", toolCallId: "...", content: "工具结果..." },\n  { role: "user", content: "帮我在 README 里增加安装说明，然后运行测试确认没有问题" }\n]\n\ntools: [read, bash, edit, write, grep, find, ls]\nmodel: Agent.state.model\nstreamFn: streamSimple`,
	},
	tool: {
		title: "模型通过 toolCall 请求 Pi 执行工具",
		intro: "模型不能直接读写你的文件系统。它只能生成 toolCall。Pi Agent 收到 toolCall 后，先校验参数，再执行对应 AgentTool，最后把结果包装成 toolResult 发回模型。",
		steps: [
			["发现 toolCall", "runLoop 从 assistant message content 里筛出 type=toolCall 的内容块。"],
			["准备工具调用", "prepareToolCall 找工具、校验参数、运行 beforeToolCall hook。"],
			["执行工具", "executePreparedToolCall 调用 read/edit/bash 的 execute。"],
			["产出结果", "finalizeExecutedToolCall 生成 AgentToolResult。"],
			["回填上下文", "createToolResultMessage 把结果变成 toolResult message，下一轮继续发给模型。"],
		],
		code: `模型输出:\n{\n  type: "toolCall",\n  name: "read",\n  id: "call_1",\n  input: { path: "README.md" }\n}\n\nPi 执行后写回:\n{\n  role: "toolResult",\n  toolCallId: "call_1",\n  content: "README 当前内容..."\n}\n\n然后模型基于 README 内容继续决定 edit 或 bash。`,
	},
	ui: {
		title: "前端不是等最后结果才更新",
		intro: "Pi 的前端/终端 UI 是事件驱动的。模型流式输出、工具开始、工具更新、工具结束、消息结束、turn 结束，都会 emit event。interactive-mode 订阅这些事件并刷新组件。",
		steps: [
			["message_start", "前端创建一条 assistant 消息区域。"],
			["message_update", "模型流式输出时逐步更新文本或 thinking/toolCall 状态。"],
			["tool_execution_start", "前端显示正在执行 read/edit/bash。"],
			["tool_execution_end", "前端显示工具结果、diff、命令输出或错误。"],
			["agent_end", "前端标记本次运行结束，并恢复输入状态。"],
		],
		code: `Agent loop emit event:\nmessage_start -> message_update -> tool_execution_start -> tool_execution_end -> turn_end -> agent_end\n\ninteractive-mode:\n收到事件 -> 更新组件状态 -> pi-tui 差分渲染 -> 用户看到实时变化`,
	},
};

const modules = [
	{
		name: "pi-ai",
		role: "多模型统一层",
		desc: "统一 OpenAI、Anthropic、Google、Bedrock、OpenRouter 等 provider。重点不是业务逻辑，而是把不同 API 的 messages、tool calls、reasoning、images、usage 和 retry 差异压平。",
		files: ["packages/ai/src/index.ts", "packages/ai/src/providers/*", "packages/ai/test/*stream*.test.ts"],
	},
	{
		name: "pi-agent-core",
		role: "通用 Agent 运行时",
		desc: "定义 AgentMessage、AgentTool、AgentEvent、AgentState，并实现 Agent、agentLoop、AgentHarness、session repo、compaction 和 resource formatting。",
		files: ["packages/agent/src/agent.ts", "packages/agent/src/agent-loop.ts", "packages/agent/src/types.ts"],
	},
	{
		name: "Agent",
		role: "状态化 wrapper",
		desc: "Agent 拥有当前 transcript、工具列表、模型、thinking level、pending tool calls、steering queue 和 follow-up queue。它让低层 runLoop 变成可订阅、可中断、可继续的对象。",
		files: ["packages/agent/src/agent.ts"],
	},
	{
		name: "AgentLoop",
		role: "最核心循环",
		desc: "runLoop 负责一轮又一轮地调用模型和工具：有 toolCall 就执行工具，有 pending steering 就注入消息，有 follow-up 就继续，否则结束。",
		files: ["packages/agent/src/agent-loop.ts"],
	},
	{
		name: "AgentSession",
		role: "coding-agent 中心对象",
		desc: "把 Agent、SessionManager、SettingsManager、ModelRegistry、ResourceLoader、ExtensionRunner、工具注册表和 compaction 全部组合到一起。",
		files: ["packages/coding-agent/src/core/agent-session.ts"],
	},
	{
		name: "内置工具",
		role: "文件与命令执行能力",
		desc: "read、bash、edit、write、grep、find、ls 是 coding agent 的行动能力。每个工具都包含 schema、参数校验、执行逻辑、结果格式化和 UI 渲染信息。",
		files: ["packages/coding-agent/src/core/tools/index.ts", "packages/coding-agent/src/core/tools/*.ts"],
	},
	{
		name: "会话系统",
		role: "记忆、分支和恢复",
		desc: "会话不是线性日志，而是可以 fork 的消息树。JSONL 存储、SessionManager、branch summary、session picker 共同支撑恢复和分享。",
		files: ["packages/coding-agent/src/core/session-manager.ts", "packages/agent/src/harness/session/jsonl-storage.ts"],
	},
	{
		name: "上下文压缩",
		role: "长任务续航",
		desc: "compaction 通过 token 估算、cut point、摘要 prompt 和 overflow recovery，在长对话中保留关键路径、函数名、错误信息和未完成事项。",
		files: ["packages/coding-agent/src/core/compaction/compaction.ts", "packages/agent/src/harness/compaction/compaction.ts"],
	},
	{
		name: "扩展系统",
		role: "命令、工具和事件注入",
		desc: "扩展可以注册工具、命令、事件监听、UI 行为和资源。AgentSession 负责把扩展产物合并进运行时，而不是让扩展直接控制主循环。",
		files: ["packages/coding-agent/src/core/extensions/*"],
	},
	{
		name: "交互 UI",
		role: "终端应用体验",
		desc: "interactive-mode 把 AgentSession 事件转换成终端组件更新，包括消息、工具执行、模型选择、settings、diff、footer 和快捷键。",
		files: ["packages/coding-agent/src/modes/interactive/interactive-mode.ts", "packages/tui/src/*"],
	},
];

const codeItems = [
	{
		title: "main.ts",
		topic: "entry",
		path: "packages/coding-agent/src/main.ts",
		why: "CLI 总入口。想知道用户输入怎么进入系统，就从这里开始。它处理参数、stdin、session 恢复、fork、运行模式和 runtime 创建。",
		read: ["resolveAppMode：TTY、参数和 stdin 如何决定模式。", "createSessionManager：新会话、恢复会话、fork 会话的入口。", "main 末尾：interactive、print、rpc 如何分流。"],
		links: ["core/agent-session-runtime.ts", "modes/interactive/interactive-mode.ts", "modes/print-mode.ts"],
		snippet: `export async function main(args: string[], options?: MainOptions) {\n  const parsed = parseArgs(args);\n  const runtimeHost = await createAgentSessionRuntime(...);\n  return runMode(runtimeHost, parsed);\n}`,
	},
	{
		title: "runLoop",
		topic: "loop",
		path: "packages/agent/src/agent-loop.ts",
		why: "Pi Agent 的心脏。它不断执行：注入 pending message -> 调用模型 -> 找 toolCall -> 执行工具 -> 写回 toolResult -> 决定是否下一轮。",
		read: ["外层 while：agent 本来要停时，还会检查 follow-up。", "内层 while：tool calls 和 steering messages 都会驱动下一轮。", "prepareNextTurn：上层可以动态切模型、thinking level 或上下文。", "shouldStopAfterTurn：上层可在 turn 结束后强制停止。"],
		links: ["streamAssistantResponse", "executeToolCalls", "prepareToolCall", "finalizeExecutedToolCall"],
		snippet: `while (true) {\n  while (hasMoreToolCalls || pendingMessages.length > 0) {\n    const message = await streamAssistantResponse(...);\n    const toolCalls = message.content.filter((c) => c.type === "toolCall");\n    const batch = await executeToolCalls(...);\n  }\n  pendingMessages = await config.getFollowUpMessages?.() || [];\n}`,
	},
	{
		title: "Agent",
		topic: "state",
		path: "packages/agent/src/agent.ts",
		why: "低层 loop 的状态化外壳。它管理当前消息、工具、模型、队列、订阅者、AbortController 和 active run。",
		read: ["PendingMessageQueue：steering 与 follow-up 为什么分开。", "subscribe：UI 和 session persistence 如何监听事件。", "run / continue：如何把 state 变成 AgentLoopConfig。"],
		links: ["PendingMessageQueue", "AgentOptions", "AgentState", "runAgentLoop"],
		snippet: `class PendingMessageQueue {\n  enqueue(message) {}\n  drain() {}\n}\n\nexport class Agent {\n  private _state;\n  private readonly steeringQueue;\n  private readonly followUpQueue;\n}`,
	},
	{
		title: "AgentSession",
		topic: "state",
		path: "packages/coding-agent/src/core/agent-session.ts",
		why: "coding-agent 真正的运行时中心。所有产品能力都在这里汇合：模型、工具、会话、扩展、系统提示词、压缩、重试、bash 执行。",
		read: ["constructor：订阅 Agent 事件并构建运行时。", "_buildRuntime：工具、扩展和系统提示词如何合并。", "_handleAgentEvent：消息如何持久化，UI 如何收到事件。", "prompt：用户输入进入 Agent 前经历了哪些处理。"],
		links: ["AgentSessionRuntime", "SessionManager", "ExtensionRunner", "buildSystemPrompt"],
		snippet: `export class AgentSession {\n  readonly agent: Agent;\n  private _toolRegistry = new Map();\n  private _extensionRunner!: ExtensionRunner;\n  private _baseSystemPrompt = \"\";\n}`,
	},
	{
		title: "tools/index.ts",
		topic: "tools",
		path: "packages/coding-agent/src/core/tools/index.ts",
		why: "内置工具总出口。这里能看出 Pi 对工具的设计：工具定义和工具实例分离，coding tools 和 read-only tools 分组。",
		read: ["ToolName union：内置工具有哪些。", "createToolDefinition vs createTool：为什么分两层。", "createCodingTools vs createReadOnlyTools：不同模式暴露不同能力。"],
		links: ["read.ts", "bash.ts", "edit.ts", "write.ts", "grep.ts", "find.ts", "ls.ts"],
		snippet: `export type ToolName = \"read\" | \"bash\" | \"edit\" | \"write\" | \"grep\" | \"find\" | \"ls\";\n\nexport function createCodingTools(cwd, options) {\n  return [createReadTool(cwd), createBashTool(cwd), createEditTool(cwd), createWriteTool(cwd)];\n}`,
	},
	{
		title: "edit.ts + edit-diff.ts",
		topic: "tools",
		path: "packages/coding-agent/src/core/tools/edit.ts",
		why: "最能体现工程细节的工具之一。它不只是写文件，还要做 fuzzy match、line ending 保留、diff 生成、并发写入保护和 UI 预览。",
		read: ["prepareEditArguments：模型输入如何标准化。", "applyEditsToNormalizedContent：oldText/newText 如何安全替换。", "withFileMutationQueue：同一文件并发编辑如何串行化。"],
		links: ["edit-diff.ts", "file-mutation-queue.ts", "render-utils.ts"],
		snippet: `validate input -> resolve path -> read file -> apply edits -> generate diff -> write file -> return result`,
	},
	{
		title: "model-registry.ts",
		topic: "models",
		path: "packages/coding-agent/src/core/model-registry.ts",
		why: "模型发现和选择层。它把配置文件、provider、OAuth/API key 状态和默认模型组织成 AgentSession 能使用的 Model。",
		read: ["模型列表从哪里来。", "provider display name 与 auth guidance 如何关联。", "没有模型或没有 API key 时如何给用户提示。"],
		links: ["auth-storage.ts", "auth-guidance.ts", "provider-display-names.ts"],
		snippet: `settings/models -> ModelRegistry -> selected Model -> Agent.state.model -> streamSimple`,
	},
	{
		title: "compaction.ts",
		topic: "state",
		path: "packages/coding-agent/src/core/compaction/compaction.ts",
		why: "长会话的续航系统。它决定什么时候压缩、切哪里、总结什么，以及 overflow 后如何恢复。",
		read: ["estimateContextTokens：上下文估算。", "findCutPoint：避免切断不完整 turn。", "generateSummary：摘要 prompt 要保留文件路径、函数名、错误。", "compact：把旧消息折叠成 summary message。"],
		links: ["branch-summarization.ts", "utils.ts", "AgentSession._handlePostAgentRun"],
		snippet: `estimateContextTokens -> shouldCompact -> prepareCompaction -> generateSummary -> compact`,
	},
	{
		title: "extensions/runner.ts",
		topic: "extension",
		path: "packages/coding-agent/src/core/extensions/runner.ts",
		why: "扩展事件的调度器。想知道扩展什么时候能插手，就看 runner 如何触发 session_start、turn、tool、shutdown 等事件。",
		read: ["扩展事件类型有哪些。", "错误监听如何处理。", "shutdown 时如何通知扩展清理资源。"],
		links: ["extensions/types.ts", "extensions/loader.ts", "extensions/wrapper.ts"],
		snippet: `AgentSession event -> ExtensionRunner -> registered handlers -> optional runtime mutation`,
	},
	{
		title: "interactive-mode.ts",
		topic: "ui",
		path: "packages/coding-agent/src/modes/interactive/interactive-mode.ts",
		why: "终端应用入口。它把 AgentSession 的抽象事件变成用户看到的输入框、消息流、工具执行状态、选择器和 footer。",
		read: ["runInteractiveMode：入口。", "组件如何订阅 session events。", "快捷键如何触发 session action。", "工具执行组件如何显示 call、update、result。"],
		links: ["components/tool-execution.ts", "components/footer.ts", "components/model-selector.ts"],
		snippet: `keyboard/input -> AgentSession.prompt -> events -> TUI component tree -> render`,
	},
	{
		title: "export-html/index.ts",
		topic: "ui",
		path: "packages/coding-agent/src/core/export-html/index.ts",
		why: "会话分享出口。它把 session messages、工具结果、ANSI 输出和 markdown 渲染成可分享 HTML。",
		read: ["消息如何转 HTML。", "工具结果如何用 tool-renderer 呈现。", "vendor marked/highlight 如何参与。"],
		links: ["tool-renderer.ts", "ansi-to-html.ts", "template.html"],
		snippet: `session entries -> message html -> tool renderer -> static export`,
	},
];

const mechanisms = [
	["事件流", "AgentEvent 是 Pi 的神经系统。message_start/update/end、tool_execution_start/update/end、turn_end、agent_end 都通过事件传递，UI、session persistence、扩展和重试都依赖它。"],
	["消息模型", "AgentMessage 比 LLM Message 更宽，包含 custom、bash execution、summary 等应用消息。真正调用模型前才通过 convertToLlm 转成 provider 可理解的消息。"],
	["工具双轨", "ToolDefinition 面向描述、扩展、渲染和配置；AgentTool 面向执行。这个拆分让工具既能被 UI 管理，也能被 Agent loop 调用。"],
	["steering vs follow-up", "steering 是运行中插入的引导，follow-up 是 agent 本来要停后继续处理的新用户消息。两者队列分开，避免交互语义混乱。"],
	["并行工具调用", "toolExecution 默认 parallel。多个工具调用可以并行执行，但文件编辑类工具通过 mutation queue 避免同一路径写入竞态。"],
	["会话树", "Pi 的 session 支持 fork，不只是线性聊天日志。每条 entry 有父子关系，因此可以切换分支、生成 branch summary、恢复上下文。"],
	["自动压缩", "当上下文接近窗口阈值，系统寻找合适 cut point，把旧 turn 总结成 summary message，保留关键文件路径和未完成事项。"],
	["模型边界", "Agent loop 不直接依赖 OpenAI/Anthropic。provider 差异集中在 pi-ai，降低上层对模型 API 变化的敏感度。"],
	["扩展隔离", "扩展通过事件、资源和工具注册影响运行时，而不是直接改写主循环。这让系统保持一个清晰的控制中心：AgentSession。"],
];

const route = [
	["准备环境", "克隆 earendil-works/pi，运行 npm install --ignore-scripts、npm run build、./pi-test.sh。先确认项目能跑。"],
	["读 README 和包结构", "先理解四个包的边界，不要一开始就钻进 provider 或 UI 细节。"],
	["从入口追一次请求", "按 main.ts -> agent-session-runtime.ts -> agent-session.ts -> agent.ts -> agent-loop.ts 追踪一次 prompt。"],
	["画消息和事件流", "手动画出 user、assistant、toolCall、toolResult、turn_end、agent_end 的关系。"],
	["读工具系统", "从 tools/index.ts 进入，再读 read、bash、edit。重点看 schema、执行、渲染和错误处理。"],
	["读会话与压缩", "读 session-manager、jsonl-storage、compaction。理解长任务为什么不会只靠完整历史硬撑。"],
	["读扩展和 UI", "最后读 extensions 与 interactive-mode。它们依赖前面的概念，晚点读会轻松很多。"],
];

const labs = [
	["追踪一次 prompt", "在源码里从 main.ts 开始，列出每一步经过的函数和对象。目标：能解释 prompt 何时变成 AgentMessage。"],
	["新增只读工具", "模仿 ls.ts 或 grep.ts 新增一个 stats 工具，只读取文件信息。目标：理解 ToolDefinition 与 AgentTool 的差别。"],
	["改一个工具渲染", "调整 bash 或 edit 的结果展示文案。目标：理解工具执行结果和 UI 渲染并不是同一层。"],
	["制造一次压缩", "降低 compaction 阈值，观察 summary message 何时插入。目标：理解 cut point 和摘要内容。"],
	["导出会话 HTML", "跟踪 export-html/index.ts 的调用链。目标：理解 session entries 如何变成静态分享页面。"],
	["写一份调用图", "用自己的话画出 AgentSession、Agent、AgentLoop、pi-ai、Tool 的关系。目标：形成长期记忆。"],
];

const flow = document.querySelector("#flow");
const explain = document.querySelector("#flowExplain");
const exampleSelect = document.querySelector("#exampleSelect");
const exampleSteps = document.querySelector("#exampleSteps");
const exampleDetail = document.querySelector("#exampleDetail");
const sequenceList = document.querySelector("#sequenceList");
const moduleGrid = document.querySelector("#moduleGrid");
const moduleSearch = document.querySelector("#moduleSearch");
const codeList = document.querySelector("#codeList");
const codeDetail = document.querySelector("#codeDetail");
const codeFilter = document.querySelector("#codeFilter");
const deepGrid = document.querySelector("#deepGrid");
const timeline = document.querySelector("#timeline");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const practiceGrid = document.querySelector("#practiceGrid");

function renderView(name) {
	const view = views[name];
	flow.innerHTML = view.nodes.map(([title, body]) => `<div class="node"><strong>${title}</strong><span>${body}</span></div>`).join("");
	explain.innerHTML = `<h3>${view.title}</h3><ul>${view.points.map((point) => `<li>${point}</li>`).join("")}</ul>`;
	document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
}

function renderSequence() {
	sequenceList.innerHTML = sequence
		.map(([title, path, body], index) => `<article class="sequence-item">
			<span class="step-num">${index + 1}</span>
			<div><h3>${title}</h3><code>${path}</code><p>${body}</p></div>
		</article>`)
		.join("");
}

function renderExample(name = "overview") {
	const example = exampleViews[name];
	exampleSteps.innerHTML = example.steps
		.map(([title, body], index) => `<button class="example-step ${index === 0 ? "active" : ""}" type="button" data-index="${index}">
			<span>${index + 1}</span>
			<strong>${title}</strong>
			<small>${body}</small>
		</button>`)
		.join("");
	exampleDetail.innerHTML = `<h3>${example.title}</h3>
		<p>${example.intro}</p>
		<pre><code>${escapeHtml(example.code)}</code></pre>`;
}

function renderModules(filter = "") {
	const needle = filter.trim().toLowerCase();
	const visible = modules.filter((item) => [item.name, item.role, item.desc, ...item.files].join(" ").toLowerCase().includes(needle));
	moduleGrid.innerHTML = visible
		.map((item) => `<article class="module-card">
			<h3>${item.name}</h3>
			<p><strong>${item.role}</strong></p>
			<p>${item.desc}</p>
			<div class="tag-row">${item.files.map((file) => `<span class="tag">${file}</span>`).join("")}</div>
		</article>`)
		.join("");
}

function renderCodeList(filter = "all") {
	const visible = codeItems.filter((item) => filter === "all" || item.topic === filter);
	codeList.innerHTML = visible
		.map((item, index) => `<button class="code-item ${index === 0 ? "active" : ""}" type="button" data-title="${item.title}">
			<strong>${item.title}</strong><span>${item.path}</span>
		</button>`)
		.join("");
	renderCodeDetail(visible[0] || codeItems[0]);
}

function renderCodeDetail(item) {
	codeDetail.innerHTML = `<h3>${item.title}</h3>
		<span class="path">${item.path}</span>
		<p>${item.why}</p>
		<h4>阅读抓手</h4>
		<ul>${item.read.map((point) => `<li>${point}</li>`).join("")}</ul>
		<h4>相关入口</h4>
		<div class="tag-row">${item.links.map((link) => `<span class="tag">${link}</span>`).join("")}</div>
		<h4>代码形状</h4>
		<pre><code>${escapeHtml(item.snippet)}</code></pre>`;
}

function renderDeepDive() {
	deepGrid.innerHTML = mechanisms
		.map(([title, body], index) => `<article class="deep-card">
			<span>${String(index + 1).padStart(2, "0")}</span>
			<h3>${title}</h3>
			<p>${body}</p>
		</article>`)
		.join("");
}

function renderRoute() {
	timeline.innerHTML = route
		.map(([title, body], index) => `<label class="step">
			<span class="step-num">${index + 1}</span>
			<span><h3>${title}</h3><p>${body}</p></span>
			<input type="checkbox" data-step="${index}" />
		</label>`)
		.join("");
	progressBar.max = route.length;
}

function renderLabs() {
	practiceGrid.innerHTML = labs
		.map(([title, body]) => `<div><strong>${title}</strong><span>${body}</span></div>`)
		.join("");
}

function updateProgress() {
	const checked = timeline.querySelectorAll("input:checked").length;
	progressText.textContent = `${checked} / ${route.length}`;
	progressBar.value = checked;
}

function escapeHtml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => renderView(button.dataset.view)));
exampleSelect.addEventListener("change", () => renderExample(exampleSelect.value));
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
renderExample();
renderSequence();
renderModules();
renderCodeList();
renderDeepDive();
renderRoute();
renderLabs();
updateProgress();
