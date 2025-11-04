# 📦 Playwright Kali Linux - npm发布指南

## 📋 项目概述

本项目为Playwright添加了Kali Linux官方支持，包含以下主要包：
- `playwright-core` - 核心浏览器自动化API
- `playwright` - 完整的测试框架
- 其他浏览器特定包

## ⚠️ 重要说明

**这是Microsoft Playwright的修改版本，包含Kali Linux支持。在发布前请确保：**

1. **版权合规**: 确保符合Apache-2.0许可证要求
2. **包名唯一性**: 必须使用不同的包名，避免与官方Playwright冲突
3. **维护责任**: 准备承担长期维护和更新的责任

## 🚀 发布到npm的完整步骤

### 第一阶段：准备工作

#### 1.1 创建npm账户（如果没有）
```bash
npm adduser
# 或者登录现有账户
npm login
```

#### 1.2 准备新的包名
由于这是修改版本，建议使用以下命名策略：
- `playwright-kali` - 主要包
- `playwright-core-kali` - 核心包
- `@your-org/playwright` - 如果使用组织账户

#### 1.3 更新package.json文件

**对于主要包 (`packages/playwright/package.json`):**
```json
{
  "name": "playwright-kali",
  "version": "1.57.0-kali.1",
  "description": "Playwright with Kali Linux support - A high-level API to automate web browsers",
  "keywords": [
    "playwright",
    "kali-linux",
    "browser",
    "automation",
    "testing",
    "security-testing"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/playwright-kali.git"
  },
  "bugs": {
    "url": "https://github.com/your-username/playwright-kali/issues"
  },
  "homepage": "https://github.com/your-username/playwright-kali#readme",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "playwright-core-kali": "1.57.0-kali.1"
  }
}
```

**对于核心包 (`packages/playwright-core/package.json`):**
```json
{
  "name": "playwright-core-kali",
  "version": "1.57.0-kali.1",
  "description": "Playwright Core with Kali Linux support",
  "keywords": [
    "playwright",
    "kali-linux",
    "browser",
    "automation"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

#### 1.4 更新内部依赖
更新所有包内部的依赖引用，确保使用新的包名。

### 第二阶段：构建和测试

#### 2.1 清理和构建
```bash
# 清理之前的构建
npm run clean

# 构建所有包
npm run build

# 运行类型检查
npm run tsc

# 运行linting
npm run lint
```

#### 2.2 运行测试
```bash
# 运行主要测试套件
npm test

# 运行特定于Kali Linux的测试
node utils/linux-browser-dependencies/run.sh kali:latest
```

#### 2.3 验证包内容
```bash
# 检查将要发布的内容
cd packages/playwright
npm pack --dry-run

cd ../playwright-core
npm pack --dry-run
```

### 第三阶段：版本管理

#### 3.1 版本号策略
使用语义化版本控制，建议格式：
- `1.57.0-kali.1` - 第一个Kali支持版本
- `1.57.0-kali.2` - 后续修复版本

#### 3.2 更新版本号
```bash
# 更新所有包的版本
npm version 1.57.0-kali.1 --workspace

# 或手动更新每个包
cd packages/playwright-core
npm version 1.57.0-kali.1

cd ../playwright
npm version 1.57.0-kali.1
```

### 第四阶段：发布流程

#### 4.1 创建发布脚本
创建 `scripts/publish.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packages = [
  'playwright-core',
  'playwright'
];

async function publishPackage(packageName) {
  console.log(`📦 发布 ${packageName}...`);

  try {
    const packagePath = path.join(__dirname, '../packages', packageName);

    // 检查package.json是否存在
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in ${packagePath}`);
    }

    process.chdir(packagePath);

    // 检查包名是否可用
    console.log(`检查包名可用性...`);
    try {
      execSync(`npm view ${packageName}-kali`, { stdio: 'pipe' });
      console.log(`⚠️  包 ${packageName}-kali 已存在`);
      return;
    } catch (error) {
      // 包不存在，可以继续
    }

    // 干运行检查
    console.log('执行干运行检查...');
    execSync('npm pack --dry-run', { stdio: 'inherit' });

    // 确认发布
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`确认发布 ${packageName}-kali? (y/N) `, resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('❌ 发布已取消');
      return;
    }

    // 发布包
    console.log('发布到npm...');
    execSync('npm publish --access public', { stdio: 'inherit' });

    console.log(`✅ ${packageName}-kali 发布成功!`);

  } catch (error) {
    console.error(`❌ 发布 ${packageName} 失败:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 开始发布 Playwright Kali Linux 支持...\n');

  // 检查是否已登录npm
  try {
    execSync('npm whoami', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ 请先登录npm: npm login');
    process.exit(1);
  }

  // 按顺序发布包（先发布依赖）
  for (const pkg of packages) {
    await publishPackage(pkg);
    console.log(''); // 空行分隔
  }

  console.log('🎉 所有包发布完成!');
  console.log('\n📝 发布后检查清单:');
  console.log('1. 访问 https://www.npmjs.com/package/playwright-kali');
  console.log('2. 访问 https://www.npmjs.com/package/playwright-core-kali');
  console.log('3. 测试安装: npm i playwright-kali');
  console.log('4. 创建GitHub Release');
  console.log('5. 更新文档');
}

main().catch(console.error);
```

#### 4.2 执行发布
```bash
# 确保已登录npm
npm login

# 运行发布脚本
node scripts/publish.js
```

### 第五阶段：发布后验证

#### 5.1 验证安装
```bash
# 测试新包的安装
npm install playwright-kali

# 创建测试项目
mkdir test-playwright-kali
cd test-playwright-kali
npm init -y
npm install playwright-kali

# 测试Kali Linux支持
npx playwright install-deps
```

#### 5.2 更新GitHub仓库
```bash
# 创建发布标签
git tag -a v1.57.0-kali.1 -m "Playwright with Kali Linux support v1.57.0-kali.1"
git push origin v1.57.0-kali.1

# 创建GitHub Release
gh release create v1.57.0-kali.1 --title "Playwright Kali Linux Support v1.57.0-kali.1" --notes "Initial release with Kali Linux official support"
```

## 📋 发布检查清单

### 发布前检查
- [ ] 已确认包名可用性
- [ ] 已更新所有package.json文件
- [ ] 已更新内部依赖引用
- [ ] 版本号符合语义化版本控制
- [ ] 已通过所有测试
- [ ] 构建成功无错误
- [ ] 已检查许可证兼容性
- [ ] 已准备更新日志

### 发布时检查
- [ ] 已登录正确的npm账户
- [ ] 确认发布的是正确的版本
- [ ] 使用`--access public`确保公共访问
- [ ] 按依赖顺序发布（先core后main）

### 发布后检查
- [ ] 包在npm网站上可见
- [ ] 安装测试成功
- [ ] 基本功能测试通过
- [ ] Kali Linux支持验证
- [ ] 已创建Git标签
- [ ] 已创建GitHub Release
- [ ] 已更新文档

## 🔄 持续维护

### 版本更新流程
1. 修复bug或添加新功能
2. 更新版本号（遵循语义化版本）
3. 运行完整测试套件
4. 更新CHANGELOG.md
5. 发布到npm
6. 创建Git标签和Release

### 监控和支持
- 设置GitHub Issues模板
- 监控npm下载统计
- 定期检查依赖更新
- 维护与上游Playwright的同步

## ⚠️ 注意事项

1. **法律合规**: 确保遵守Microsoft Playwright的许可证条款
2. **品牌差异**: 明确标识这是Kali Linux支持的分支版本
3. **安全责任**: 承担代码审查和安全维护责任
4. **社区支持**: 提供有效的用户支持渠道

## 📞 获取帮助

- npm官方文档: https://docs.npmjs.com/
- 语义化版本: https://semver.org/
- npm发布问题: https://www.npmjs.com/support

---

**免责声明**: 本指南基于当前Playwright项目结构。实际发布前请根据具体情况进行调整。