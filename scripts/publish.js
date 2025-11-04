#!/usr/bin/env node

/**
 * Playwright Kali Linux - npm发布脚本
 *
 * 使用方法:
 * node scripts/publish.js
 *
 * 环境变量:
 * - DRY_RUN=true: 仅执行干运行，不实际发布
 * - FORCE=true: 跳过确认提示
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 配置
const CONFIG = {
  // 要发布的包（按依赖顺序）
  packages: [
    'playwright-core',
    'playwright'
  ],
  // 新包名后缀
  nameSuffix: '-kali',
  // 版本后缀
  versionSuffix: '-kali.1'
};

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 确认提示
async function confirm(message) {
  if (process.env.FORCE === 'true') {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question(`${message} (y/N) `, resolve);
  });
  rl.close();

  return answer.toLowerCase() === 'y';
}

// 检查命令是否存在
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// 检查npm登录状态
function checkNpmLogin() {
  try {
    const username = execSync('npm whoami', { encoding: 'utf8' }).trim();
    log(`✅ 已登录npm: ${username}`, 'green');
    return true;
  } catch (error) {
    log('❌ 未登录npm，请先运行: npm login', 'red');
    return false;
  }
}

// 检查包名是否可用
function checkPackageAvailability(packageName) {
  try {
    execSync(`npm view ${packageName}`, { stdio: 'pipe' });
    return false; // 包已存在
  } catch {
    return true; // 包可用
  }
}

// 更新package.json
function updatePackageJson(packagePath, packageName) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const originalName = packageJson.name;
  const originalVersion = packageJson.version;

  // 更新包名
  packageJson.name = packageName;

  // 更新版本
  if (!packageJson.version.includes('-kali')) {
    packageJson.version = packageJson.version.replace(/-next$/, '') + CONFIG.versionSuffix;
  }

  // 添加发布配置
  packageJson.publishConfig = {
    access: 'public'
  };

  // 更新描述和关键词
  if (!packageJson.description.includes('Kali Linux')) {
    packageJson.description = packageJson.description + ' with Kali Linux support';
  }

  if (!packageJson.keywords) {
    packageJson.keywords = [];
  }

  const kaliKeywords = ['kali-linux', 'security-testing', 'penetration-testing'];
  kaliKeywords.forEach(keyword => {
    if (!packageJson.keywords.includes(keyword)) {
      packageJson.keywords.push(keyword);
    }
  });

  // 更新内部依赖
  if (packageJson.dependencies && packageJson.dependencies['playwright-core']) {
    packageJson.dependencies['playwright-core'] = 'playwright-core' + CONFIG.versionSuffix;
  }

  // 添加仓库信息（如果需要）
  if (!packageJson.repository.url.includes('kali')) {
    log(`⚠️  请手动更新 ${packageName} 的repository URL`, 'yellow');
  }

  // 备份原文件
  const backupPath = packageJsonPath + '.backup';
  fs.copyFileSync(packageJsonPath, backupPath);

  // 写入更新的package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  return {
    originalName,
    originalVersion,
    newName: packageJson.name,
    newVersion: packageJson.version
  };
}

// 恢复package.json
function restorePackageJson(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const backupPath = packageJsonPath + '.backup';

  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, packageJsonPath);
    fs.unlinkSync(backupPath);
  }
}

// 验证包内容
function validatePackage(packagePath) {
  try {
    process.chdir(packagePath);

    // 检查必要文件
    const requiredFiles = ['package.json', 'README.md'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`缺少必要文件: ${file}`);
      }
    }

    // 干运行打包
    log('执行打包干运行...', 'cyan');
    execSync('npm pack --dry-run', { stdio: 'pipe' });

    log('✅ 包验证通过', 'green');
    return true;
  } catch (error) {
    log(`❌ 包验证失败: ${error.message}`, 'red');
    return false;
  }
}

// 发布单个包
async function publishPackage(packageName) {
  const packagePath = path.join(__dirname, '../packages', packageName);
  const newPackageName = packageName + CONFIG.nameSuffix;

  log(`\n📦 处理包: ${packageName} -> ${newPackageName}`, 'blue');

  try {
    // 检查包目录
    if (!fs.existsSync(packagePath)) {
      throw new Error(`包目录不存在: ${packagePath}`);
    }

    process.chdir(packagePath);

    // 检查包名可用性
    log('检查包名可用性...', 'cyan');
    if (!checkPackageAvailability(newPackageName)) {
      log(`⚠️  包 ${newPackageName} 已存在，跳过发布`, 'yellow');
      return true;
    }

    // 更新package.json
    log('更新package.json...', 'cyan');
    const updateInfo = updatePackageJson(packagePath, newPackageName);

    try {
      // 验证包
      if (!validatePackage(packagePath)) {
        throw new Error('包验证失败');
      }

      // 确认发布
      if (process.env.DRY_RUN === 'true') {
        log(`🔍 干运行模式: ${newPackageName} v${updateInfo.newVersion}`, 'yellow');
        return true;
      }

      const shouldPublish = await confirm(`确认发布 ${newPackageName} v${updateInfo.newVersion}?`);
      if (!shouldPublish) {
        log('❌ 发布已取消', 'red');
        return false;
      }

      // 发布包
      log('发布到npm...', 'cyan');
      execSync('npm publish --access public', { stdio: 'inherit' });

      log(`✅ ${newPackageName} v${updateInfo.newVersion} 发布成功!`, 'green');
      return true;

    } finally {
      // 恢复原始package.json
      restorePackageJson(packagePath);
    }

  } catch (error) {
    log(`❌ 发布 ${packageName} 失败: ${error.message}`, 'red');
    // 确保恢复package.json
    restorePackageJson(packagePath);
    return false;
  }
}

// 主函数
async function main() {
  log('🚀 Playwright Kali Linux - npm发布脚本', 'bright');
  log('=' .repeat(50), 'cyan');

  // 检查必要工具
  log('检查环境...', 'cyan');

  if (!commandExists('npm')) {
    log('❌ npm未安装', 'red');
    process.exit(1);
  }

  if (!checkNpmLogin()) {
    process.exit(1);
  }

  if (process.env.DRY_RUN !== 'true') {
    log('\n⚠️  准备发布到npm!', 'yellow');
    log('这是对Microsoft Playwright的修改版本', 'yellow');
    log('请确保您有发布此修改版本的权限', 'yellow');

    const shouldContinue = await confirm('继续发布?');
    if (!shouldContinue) {
      log('❌ 发布已取消', 'red');
      process.exit(0);
    }
  }

  // 发布包
  const results = [];

  for (const packageName of CONFIG.packages) {
    const success = await publishPackage(packageName);
    results.push({ package: packageName, success });
  }

  // 输出结果
  log('\n📊 发布结果:', 'bright');
  log('-'.repeat(30), 'cyan');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    log('✅ 成功发布的包:', 'green');
    successful.forEach(r => {
      const packageName = r.package + CONFIG.nameSuffix;
      log(`   - ${packageName}`, 'green');
    });
  }

  if (failed.length > 0) {
    log('❌ 发布失败的包:', 'red');
    failed.forEach(r => {
      log(`   - ${r.package}`, 'red');
    });
  }

  if (process.env.DRY_RUN !== 'true' && successful.length > 0) {
    log('\n📝 发布后任务:', 'yellow');
    log('1. 创建Git标签: git tag -a v1.57.0-kali.1 -m "Playwright with Kali Linux support"', 'yellow');
    log('2. 推送标签: git push origin v1.57.0-kali.1', 'yellow');
    log('3. 创建GitHub Release', 'yellow');
    log('4. 测试安装: npm install playwright-kali', 'yellow');
    log('5. 更新文档和README', 'yellow');
  }

  log('\n🎉 脚本执行完成!', 'bright');

  // 设置退出码
  if (failed.length > 0) {
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log(`❌ 未捕获的异常: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ 未处理的Promise拒绝: ${reason}`, 'red');
  process.exit(1);
});

// 运行主函数
main();