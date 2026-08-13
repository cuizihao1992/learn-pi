---
title: "while 循环在计算机底层是怎么实现的"
module: "Mini Agent"
source_html: "modules/mini-agent/while-loop-machine.html"
site_url: "https://cuizihao1992.github.io/learn-pi/modules/mini-agent/while-loop-machine.html"
tags:
  - learn-pi
  - module/mini-agent
---

> Computer Fundamentals

# while 循环在计算机底层是怎么实现的

`while` 不是 CPU 里天然存在的结构。它是高级语言给人的写法，编译后会变成比较指令和跳转指令；再往下是机器码；最后由 CPU 的程序计数器、ALU、标志位和分支控制硬件执行。理解这一点，才能真正看懂 Mini Agent 里的 `while (true)` 为什么可以驱动 Agent Loop。

## 一句话模型

```text
while 循环
  = 条件判断
  + 条件跳转
  + 循环体
  + 跳回循环开头

CPU 不认识 while。
CPU 只认识：比较、修改标志位、跳转到某个地址。
```

## 从源代码到硬件

| 层级 | 看到的形式 | 作用 |
| --- | --- | --- |
| 高级语言 | while (i < 3) { i++; } | 给人看的控制结构。 |
| 中间表示 | 基本块、分支、跳转标签 | 编译器优化用。 |
| 汇编 | cmp 、 jge 、 add 、 jmp | 接近机器指令的人类可读形式。 |
| 机器码 | 83 F8 03 7D ... | CPU 取指执行的字节。 |
| 硬件 | PC、ALU、FLAGS、分支单元 | 真正执行比较和跳转。 |

## 一个最小例子

C 代码：

```text
int i = 0;
while (i < 3) {
  i++;
}
```

逻辑上等价于：

```text
int i = 0;

loop_start:
if (!(i < 3)) goto loop_end;
i++;
goto loop_start;

loop_end:
```

所以 `while` 的本质可以先记成：

```text
while = if + goto
```

## 对应的汇编长什么样

编译器可能生成类似 x86 汇编：

```text
mov eax, 0        ; i = 0

loop_start:
cmp eax, 3        ; 比较 i 和 3
jge loop_end      ; 如果 i >= 3，跳出循环
add eax, 1        ; i++
jmp loop_start    ; 回到循环开始

loop_end:
```

| 指令 | 作用 | 和 while 的关系 |
| --- | --- | --- |
| mov eax, 0 | 把 0 放进寄存器。 | 初始化循环变量。 |
| cmp eax, 3 | 比较寄存器和常量。 | 计算循环条件。 |
| jge loop_end | 如果大于等于就跳转。 | 条件不满足时退出。 |
| add eax, 1 | 加 1。 | 执行循环体。 |
| jmp loop_start | 无条件跳转。 | 回到下一轮循环。 |

## 机器码层发生什么

汇编不是 CPU 最终执行的东西。汇编器会把它转成机器码字节。不同架构字节不同，下面只是帮助建立直觉：

```text
B8 00 00 00 00    ; mov eax, 0
83 F8 03          ; cmp eax, 3
7D 03             ; jge loop_end
83 C0 01          ; add eax, 1
EB F8             ; jmp loop_start
```

CPU 真正取出来执行的是这些字节。`while` 这个词在机器码里已经不存在了。

## CPU 硬件怎么执行跳转

```text
1. PC / instruction pointer 指向当前指令地址
2. CPU 从内存或指令缓存取出机器码
3. 解码器把机器码解码成内部微操作
4. ALU 执行比较或加法
5. FLAGS 记录比较结果，例如 zero flag、sign flag、carry flag
6. 条件跳转指令读取 FLAGS
7. 条件成立：PC 改成 loop_end 地址
8. 条件不成立：PC 继续指向下一条指令
9. jmp loop_start 会把 PC 改回循环开头
```

所以循环不是硬件里有一个“重复按钮”。真正发生的是：程序计数器一次又一次被改回前面的地址。

## 现代 CPU 还会做什么优化

- 分支预测： CPU 猜 `while` 条件下一次大概率成立还是不成立，提前取指。

- 流水线： 取指、译码、执行、访存、写回可以重叠进行。

- 指令缓存： 循环体经常重复执行，容易留在高速缓存里。

- 乱序执行： 在不改变最终结果的前提下，CPU 可能调整内部执行顺序。

- 循环优化： 编译器可能做循环展开、强度削弱、死代码删除等优化。

## 和 Mini Agent 的关系

Mini Agent 里的核心循环通常长这样：

```text
while (true) {
  const assistant = await callModel(messages, tools);
  messages.push(assistant);

  const toolCalls = assistant.tool_calls || [];
  if (toolCalls.length === 0) {
    return assistant.content;
  }

  for (const toolCall of toolCalls) {
    const result = await runTool(toolCall);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: result
    });
  }
}
```

从业务上看，它是 Agent Loop。从计算机底层看，它仍然是条件判断和跳转。

```text
Agent Loop 语义:
  模型决定下一步
  -> 如果没有工具调用就结束
  -> 如果有工具调用就执行工具
  -> 把结果放回上下文
  -> 回到循环开头

机器执行语义:
  比较条件
  -> 条件跳转
  -> 执行循环体
  -> 跳回循环开头
```

## 常见误解

- 误解一：CPU 直接执行 while。 不对。CPU 执行机器码，`while` 已经被编译成比较和跳转。

- 误解二：汇编就是最底层。 不对。汇编还要变成机器码，机器码再由硬件电路执行。

- 误解三：循环一定慢。 不一定。小循环可能被缓存、预测、展开，关键看数据依赖和分支是否可预测。

- 误解四：while(true) 一定死循环。 不一定。Agent Loop 里通常靠 `return`、`break`、最大步数或错误条件终止。

## 自测问题

- 为什么说 `while = if + goto`？

- `cmp` 指令本身会不会跳转？真正跳转的是哪类指令？

- 条件跳转为什么需要 FLAGS？

- 程序计数器 PC 在循环里为什么会回到旧地址？

- Mini Agent 的 `while (true)` 靠什么条件停止？

回到 Agent Loop
[[02 - Mini Agent/02 - 最小 Agent Loop：模型决策、工具执行、结果回填|看模型决策、工具执行、结果回填]]
