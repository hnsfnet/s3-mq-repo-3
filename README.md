# CLI Template Manager (ctm)

一个基于 Node.js 的命令行工具，帮助开发者快速初始化和管理项目模板。

## 功能特性

- **模板初始化**: 支持从 GitHub/GitLab 仓库拉取模板并初始化本地项目
- **模板版本管理**: 支持为模板打版本标签、查看版本历史、回滚到指定版本
- **模板变量替换**: 自动扫描模板中的 `{{variable}}` 占位符，交互式填充变量值
- **模板市场**: 支持从 GitHub 搜索社区模板，一键添加使用
- **模板管理**: 支持查看、添加、删除本地模板列表
- **配置管理**: 支持配置默认模板仓库、项目目录、模板市场组织等参数
- **交互式 CLI**: 提供友好的命令行交互界面
- **跨平台**: 支持 Windows、macOS 和 Linux

## 技术栈

- **TypeScript**: 类型安全的 JavaScript 超集
- **Commander.js**: 命令行框架
- **Inquirer.js**: 交互式命令行用户界面
- **Chalk**: 终端输出美化
- **Ora**: 终端加载动画
- **Jest**: 单元测试框架

## 安装

### 前置要求

- Node.js >= 14.0.0
- Git (用于克隆模板仓库)

### 从源码构建

```bash
# 克隆项目
git clone <repository-url>
cd cli-template-manager

# 安装依赖
npm install

# 构建项目
npm run build

# 全局链接（可选，用于本地测试）
npm link
```

安装完成后，你可以使用 `ctm` 命令来运行工具。

## 使用说明

### 初始化项目

使用 `init` 命令从模板初始化一个新项目。支持版本选择和变量替换功能。

#### 交互式模式

```bash
ctm init
```

运行后会提示你输入项目名称、选择模板、选择版本（如有）和目标目录。如果模板中包含 `{{variable}}` 变量，还会提示你填写变量值。

#### 命令行参数模式

```bash
# 使用指定模板初始化项目
ctm init my-project --template default-ts

# 指定模板版本
ctm init my-project --template default-ts --version-tag v1.0.0

# 指定目标目录
ctm init my-project --template default-ts --dir ./projects

# 强制覆盖已存在的目录
ctm init my-project --template default-ts --force

# 跳过变量替换
ctm init my-project --template default-ts --skip-variables
```

**选项:**

- `-t, --template <template>`: 模板名称
- `-V, --version-tag <version>`: 模板版本标签
- `-d, --dir <directory>`: 目标目录
- `-f, --force`: 强制覆盖已存在的目录
- `--skip-variables`: 跳过模板变量替换

#### 模板变量说明

在模板文件和文件名中可以使用 `{{variableName}}` 格式的占位符。初始化项目时，工具会：

1. 自动扫描所有文本文件（.js, .ts, .json, .md, .html 等）中的变量
2. 扫描文件名中的变量
3. 交互式提示用户输入每个变量的值
4. 自动替换文件内容和文件名中的占位符

示例模板变量：

- `{{projectName}}` - 项目名称
- `{{author}}` - 作者名称
- `{{description}}` - 项目描述
- `{{version}}` - 初始版本号

### 模板管理

#### 列出所有模板

```bash
ctm template list
```

显示所有已添加的模板，包括仓库地址、分支、描述、类型和版本数量。

#### 添加模板

```bash
# 交互式添加
ctm template add

# 命令行参数添加
ctm template add \
  --name my-template \
  --repo https://github.com/user/repo.git \
  --branch main \
  --description "My custom template" \
  --type github
```

**选项:**

- `-n, --name <name>`: 模板名称
- `-r, --repo <repo>`: 模板仓库 URL
- `-b, --branch <branch>`: 分支名称 (默认: main)
- `-d, --description <description>`: 模板描述
- `-t, --type <type>`: 模板类型 (github/gitlab/local)

#### 删除模板

```bash
ctm template remove <template-name>
```

#### 为模板打版本标签

```bash
# 交互式打标签
ctm template tag my-template v1.0.0

# 带描述和 commit hash
ctm template tag my-template v1.1.0 \
  --description "Added new features" \
  --commit abc1234
```

**选项:**

- `-d, --description <description>`: 版本描述
- `-c, --commit <commit>`: 关联的 commit hash

版本标签支持 semver 格式，如 `1.0.0`、`v1.0.0`、`1.0.0-alpha` 等。

#### 查看模板版本历史

```bash
ctm template list-versions my-template
```

显示模板的所有版本，按创建时间倒序排列，包括版本号、描述、commit hash 和创建时间。

#### 删除模板版本

```bash
ctm template remove-version my-template v1.0.0
```

### 模板市场（搜索社区模板）

使用 `search` 命令从 GitHub 搜索社区模板。

```bash
# 搜索所有模板
ctm search

# 按关键词搜索
ctm search react

# 搜索指定组织
ctm search --org my-org

# 按关键词和组织搜索
ctm search typescript --org my-org

# 限制结果数量
ctm search --limit 20

# 搜索并交互式添加模板
ctm search vue --add
```

**选项:**

- `-o, --org <organization>`: GitHub 组织名称
- `-l, --limit <number>`: 结果数量限制（默认 10）
- `-a, --add`: 交互式选择并添加模板

搜索结果展示模板的完整名称、描述、星标数量、编程语言和标签。

### 配置管理

#### 列出所有配置

```bash
ctm config list
```

显示当前所有配置项，包括默认模板、项目目录、模板市场组织和模板列表。

#### 获取配置项

```bash
ctm config get <key>
```

支持的配置键:

- `defaultTemplate`: 默认模板名称
- `projectDir`: 默认项目目录
- `templateMarketOrg`: 模板市场默认 GitHub 组织

#### 设置配置项

```bash
# 设置默认模板
ctm config set defaultTemplate my-template

# 设置默认项目目录
ctm config set projectDir /path/to/projects

# 设置模板市场默认组织
ctm config set templateMarketOrg my-org
```

#### 查看配置文件路径

```bash
ctm config path
```

显示配置文件的存储位置。配置文件默认存储在 `~/.ctm/config.json`。

## 项目结构

```
cli-template-manager/
├── src/
│   ├── commands/          # 命令实现
│   │   ├── init.ts        # init 命令 - 初始化项目（含版本选择和变量替换）
│   │   ├── template.ts    # template 命令 - 模板管理（含版本管理）
│   │   ├── config.ts      # config 命令 - 配置管理
│   │   └── search.ts      # search 命令 - 模板市场搜索
│   ├── utils/             # 工具函数
│   │   ├── config.ts      # 配置文件管理（含版本存储）
│   │   ├── git.ts         # Git 相关操作（含版本克隆）
│   │   ├── logger.ts      # 日志输出工具
│   │   ├── variables.ts   # 模板变量扫描与替换
│   │   └── market.ts      # 模板市场 API 调用
│   ├── types/             # TypeScript 类型定义
│   │   └── index.ts
│   ├── cli.ts             # Commander 配置
│   └── index.ts           # CLI 入口文件
├── tests/                 # 单元测试
│   ├── cli.test.ts        # CLI 命令测试
│   ├── git.test.ts        # Git 工具测试
│   ├── types.test.ts      # 类型定义测试
│   ├── variables.test.ts  # 变量替换工具测试
│   └── features.test.ts   # 新功能特性测试
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启用 TypeScript 编译监听模式。

### 构建

```bash
npm run build
```

将 TypeScript 编译到 `dist` 目录。

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch
```

### 运行 CLI

```bash
# 开发时运行
npm start -- [command] [options]

# 示例
npm start -- --help
npm start -- template list
npm start -- search react
```

## 配置文件

配置文件存储在用户主目录下的 `.ctm/config.json`：

```json
{
  "defaultTemplate": "default-ts",
  "projectDir": "/path/to/default/directory",
  "templateMarketOrg": "ctm-templates",
  "templates": [
    {
      "name": "default-ts",
      "repo": "https://github.com/typescript-template/ts-starter.git",
      "branch": "main",
      "description": "Default TypeScript starter template",
      "type": "github",
      "versions": [
        {
          "version": "1.0.0",
          "tag": "v1.0.0",
          "commitHash": "abc1234",
          "createdAt": 1700000000000,
          "description": "Initial release"
        }
      ]
    }
  ]
}
```

## 支持的仓库 URL 格式

- GitHub HTTPS: `https://github.com/user/repo.git`
- GitHub SSH: `git@github.com:user/repo.git`
- GitLab HTTPS: `https://gitlab.com/user/repo.git`
- GitLab SSH: `git@gitlab.com:user/repo.git`

## 版本历史

### v2.0.0 (当前版本)

- ✨ 新增模板版本管理功能（tag/list-versions/remove-version）
- ✨ 新增模板变量替换功能（{{variable}} 占位符扫描与替换）
- ✨ 新增模板市场 search 命令（GitHub 社区模板搜索）
- 🔧 init 命令集成版本选择和变量替换
- 🔧 新增 templateMarketOrg 配置项
- 🔧 优化交互式 CLI 体验

### v1.0.0

- 🎉 初始版本发布
- ✨ 模板初始化功能
- ✨ 模板管理功能（list/add/remove）
- ✨ 配置管理功能（get/set/list）
- ✨ 交互式 CLI 支持

## 常见问题

### 1. 如何添加私有仓库模板？

确保你已经配置好了 Git 的 SSH 密钥或凭据管理器，然后使用 SSH 格式的仓库 URL 添加模板。

### 2. 配置文件存储在哪里？

- Windows: `C:\Users\<username>\.ctm\config.json`
- macOS/Linux: `~/.ctm/config.json`

### 3. 如何重置配置？

删除配置文件或整个 `.ctm` 目录即可重置所有配置。工具会在下次运行时重新生成默认配置。

### 4. 如何创建带变量的模板？

在模板的文件内容或文件名中使用 `{{variableName}}` 格式的占位符即可。例如：

- package.json 中: `"name": "{{projectName}}"`
- 文件名: `{{projectName}}.config.ts`

### 5. 如何为模板添加版本？

先将模板添加到本地，然后使用 `ctm template tag <template> <version>` 命令打标签。版本号建议遵循 semver 规范。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
