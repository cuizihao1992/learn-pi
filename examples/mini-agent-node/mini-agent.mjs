import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const cwd = process.cwd();

if (!API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const userTask = process.argv.slice(2).join(" ") || "读取 README.md 并总结。";

const tools = [
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a UTF-8 text file from the current project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path." }
        },
        required: ["path"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "writeFile",
      description: "Write UTF-8 text to a file in the current project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path." },
          content: { type: "string", description: "Complete new file content." }
        },
        required: ["path", "content"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "runCommand",
      description: "Run a shell command in the current project.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Command to run." }
        },
        required: ["command"],
        additionalProperties: false
      }
    }
  }
];

function resolveInsideProject(relativePath) {
  const fullPath = path.resolve(cwd, relativePath);
  if (!fullPath.startsWith(cwd)) {
    throw new Error(`Path escapes project: ${relativePath}`);
  }
  return fullPath;
}

async function runTool(toolCall) {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || "{}");

  console.log(`\n[tool] ${name}`, args);

  if (name === "readFile") {
    const fullPath = resolveInsideProject(args.path);
    return await fs.readFile(fullPath, "utf8");
  }

  if (name === "writeFile") {
    const fullPath = resolveInsideProject(args.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, args.content, "utf8");
    return `Wrote ${args.path}`;
  }

  if (name === "runCommand") {
    const { stdout, stderr } = await execAsync(args.command, {
      cwd,
      timeout: 120_000,
      maxBuffer: 1024 * 1024
    });
    return stdout || stderr || "Command completed with no output.";
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function callModel(messages) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto"
    })
  });

  if (!response.ok) {
    throw new Error(`Model API error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  return json.choices[0].message;
}

async function runAgent(task) {
  const messages = [
    {
      role: "system",
      content: [
        "你是一个最小 coding agent。",
        "你可以读取文件、写文件、运行命令。",
        "先观察再修改；修改后尽量运行验证命令。",
        "不要访问当前项目目录之外的路径。",
        "最终回答要总结做了什么、验证结果是什么。"
      ].join("\n")
    },
    { role: "user", content: task }
  ];

  for (let step = 0; step < 12; step += 1) {
    const assistant = await callModel(messages);
    messages.push(assistant);

    const toolCalls = assistant.tool_calls || [];
    if (toolCalls.length === 0) {
      return assistant.content || "";
    }

    for (const toolCall of toolCalls) {
      try {
        const result = await runTool(toolCall);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: String(result).slice(0, 20_000)
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Tool error: ${error.message}`
        });
      }
    }
  }

  return "Stopped after 12 steps to avoid an infinite loop.";
}

const finalAnswer = await runAgent(userTask);
console.log("\n[final]\n" + finalAnswer);
