# 📦 Playwright Kali Linux - 发布指南

## 🚀 快速开始

### 1. 运行发布前检查
```bash
node scripts/pre-publish-check.js
```

### 2. 构建项目
```bash
npm run build
```

### 3. 运行测试
```bash
npm test
```

### 4. 登录npm
```bash
npm login
```

### 5. 发布到npm
```bash
# 选项1：使用Node.js脚本（推荐）
node scripts/publish.js

# 选项2：使用Bash脚本
./scripts/quick-publish.sh

# 选项3：干运行（不实际发布）
DRY_RUN=true node scripts/publish.js
```

## 📋 发布脚本说明

### scripts/publish.js
完整的Node.js发布脚本，具有：
- ✅ 完整的错误处理
- ✅ 彩色日志输出
- ✅ 包名可用性检查
- ✅ 自动更新package.json
- ✅ 版本管理
- ✅ 发布确认

### scripts/quick-publish.sh
简化的Bash发布脚本，适合快速发布：
- ✅ 轻量级
- ✅ 快速执行
- ✅ 基本的错误检查

### scripts/pre-publish-check.js
发布前检查脚本，验证：
- ✅ Kali Linux支持代码
- ✅ 依赖项配置
- ✅ 文档更新
- ✅ 文件完整性
- ✅ 构建状态
- ✅ Git状态
- ✅ npm登录状态
- ✅ 包名可用性

## 📝 重要提醒

### ⚠️ 发布前准备
1. **备份代码**: 确保所有更改已提交到Git
2. **版本管理**: 使用语义化版本号
3. **测试验证**: 运行完整的测试套件
4. **文档更新**: 更新README和CHANGELOG

### 🔐 npm账户要求
- 必须有npm账户
- 包名必须唯一（`playwright-kali`, `playwright-core-kali`）
- 确保有发布权限

### 📄 许可证合规
- 保持Apache-2.0许可证
- 尊重原始Microsoft Playwright版权
- 明确标识修改版本

## 🛠️ 故障排除

### 常见问题

**Q: npm登录失败**
```bash
npm login
# 或
npm adduser
```

**Q: 包名已存在**
- 选择不同的包名
- 使用组织作用域：`@your-org/playwright`

**Q: 发布权限错误**
- 检查npm账户权限
- 确认包名未被占用
- 使用`--access public`标志

**Q: 构建失败**
```bash
npm run clean
npm run build
npm run lint
```

**Q: 测试失败**
```bash
npm test
# 或运行特定测试
npm run ctest  # Chromium测试
npm run ftest  # Firefox测试
npm run wtest  # WebKit测试
```

## 📊 发布后验证

### 1. 验证npm包
```bash
# 检查包是否发布成功
npm view playwright-kali
npm view playwright-core-kali

# 测试安装
npm install playwright-kali
```

### 2. 验证功能
```bash
# 创建测试项目
mkdir test-playwright-kali
cd test-playwright-kali
npm init -y
npm install playwright-kali

# 测试Kali Linux支持
npx playwright install-deps
npx playwright --version
```

### 3. 更新Git仓库
```bash
# 创建标签
git tag -a v1.57.11 -m "Playwright with Kali Linux support"

# 推送标签
git push origin v1.57.11

# 创建GitHub Release
gh release create v1.57.11 --title "Playwright Kali Linux Support v1.57.11" --notes "Initial release with Kali Linux official support"
```

## 📞 获取帮助

- 📖 完整文档：`NPM_PUBLISH_GUIDE.md`
- 🐛 问题报告：GitHub Issues
- 💬 社区讨论：GitHub Discussions
- 📧 官方支持：npm Support

---

**免责声明**: 这是Microsoft Playwright的修改版本，添加了Kali Linux支持。请确保遵守相关许可证条款。