# Mini Agent MVP

一个最小 Node.js agent，用 OpenAI-compatible Chat Completions 接口实现：

- 模型调用
- toolCall 解析
- 工具执行
- toolResult 回填
- 多轮 agent loop

## 运行

```bash
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_API_KEY="你的 key"
export OPENAI_MODEL="gpt-4.1-mini"
npm start -- "读取 README.md，总结内容，如果没有安装说明就补上，然后运行 npm test"
```

PowerShell:

```powershell
$env:OPENAI_BASE_URL="https://api.openai.com/v1"
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_MODEL="gpt-4.1-mini"
npm start -- "读取 README.md，总结内容，如果没有安装说明就补上，然后运行 npm test"
```

## 注意

这是教学 MVP，不是安全沙箱。它只做了一个简单限制：文件路径不能逃出当前项目目录。真实产品还需要权限确认、命令白名单、会话保存、上下文压缩、流式输出和更严格的工具校验。
