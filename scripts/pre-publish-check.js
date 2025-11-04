#!/usr/bin/env node

/**
 * Playwright Kali Linux - 发布前检查脚本
 * 在发布前验证所有必要的条件和文件
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const checks = [];

// 添加检查项目
function addCheck(name, fn) {
  checks.push({ name, fn });
}

// 检查项目：验证Kali Linux支持代码
addCheck('Kali Linux平台检测代码', () => {
  const hostPlatformPath = 'packages/playwright-core/src/server/utils/hostPlatform.ts';
  const content = fs.readFileSync(hostPlatformPath, 'utf8');

  const hasKaliDetection = content.includes("distroInfo?.id === 'kali'");
  const hasKaliInType = content.includes("'kali-x64' | 'kali-arm64'");
  const hasOfficialSupport = content.includes('isOfficiallySupportedPlatform = true');

  if (hasKaliDetection && hasKaliInType && hasOfficialSupport) {
    log('✅ Kali Linux平台检测代码正确', 'green');
    return true;
  } else {
    log('❌ Kali Linux平台检测代码不完整', 'red');
    if (!hasKaliDetection) log('   - 缺少Kali检测逻辑', 'red');
    if (!hasKaliInType) log('   - 缺少Kali在HostPlatform类型中的定义', 'red');
    if (!hasOfficialSupport) log('   - 缺少官方支持标记', 'red');
    return false;
  }
});

// 检查项目：验证依赖项配置
addCheck('Kali Linux依赖项配置', () => {
  const nativeDepsPath = 'packages/playwright-core/src/server/registry/nativeDeps.ts';
  const content = fs.readFileSync(nativeDepsPath, 'utf8');

  const hasKaliX64 = content.includes("'kali-x64':");
  const hasKaliARM64 = content.includes("deps['kali-arm64']");
  const hasChromiumDeps = content.includes('chromium:') && hasKaliX64;
  const hasFirefoxDeps = content.includes('firefox:') && hasKaliX64;
  const hasWebkitDeps = content.includes('webkit:') && hasKaliX64;

  if (hasKaliX64 && hasKaliARM64 && hasChromiumDeps && hasFirefoxDeps && hasWebkitDeps) {
    log('✅ Kali Linux依赖项配置完整', 'green');
    return true;
  } else {
    log('❌ Kali Linux依赖项配置不完整', 'red');
    if (!hasKaliX64) log('   - 缺少kali-x64配置', 'red');
    if (!hasKaliARM64) log('   - 缺少kali-arm64配置', 'red');
    if (!hasChromiumDeps) log('   - 缺少Chromium依赖项', 'red');
    if (!hasFirefoxDeps) log('   - 缺少Firefox依赖项', 'red');
    if (!hasWebkitDeps) log('   - 缺少WebKit依赖项', 'red');
    return false;
  }
});

// 检查项目：验证README更新
addCheck('README.md文档更新', () => {
  const readmePath = 'README.md';
  if (!fs.existsSync(readmePath)) {
    log('❌ README.md文件不存在', 'red');
    return false;
  }

  const content = fs.readFileSync(readmePath, 'utf8');
  const hasKaliSupport = content.includes('Kali Linux');
  const hasLinuxSection = content.includes('Linux Distribution Support');

  if (hasKaliSupport && hasLinuxSection) {
    log('✅ README.md包含Kali Linux支持信息', 'green');
    return true;
  } else {
    log('❌ README.md缺少Kali Linux支持信息', 'red');
    if (!hasKaliSupport) log('   - 缺少Kali Linux提及', 'red');
    if (!hasLinuxSection) log('   - 缺少Linux发行版支持章节', 'red');
    return false;
  }
});

// 检查项目：验证必要文件存在
addCheck('必要文件存在性', () => {
  const requiredFiles = [
    'package.json',
    'README.md',
    'LICENSE',
    'packages/playwright/package.json',
    'packages/playwright-core/package.json',
    'scripts/publish.js',
    'scripts/quick-publish.sh'
  ];

  const missing = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      missing.push(file);
    }
  }

  if (missing.length === 0) {
    log('✅ 所有必要文件都存在', 'green');
    return true;
  } else {
    log('❌ 缺少必要文件:', 'red');
    missing.forEach(file => log(`   - ${file}`, 'red'));
    return false;
  }
});

// 检查项目：验证构建状态
addCheck('项目构建状态', () => {
  try {
    // 检查是否有构建输出目录
    const hasBuildOutput = fs.existsSync('packages/playwright/lib') &&
                          fs.existsSync('packages/playwright-core/lib');

    if (hasBuildOutput) {
      log('✅ 项目已构建', 'green');
      return true;
    } else {
      log('⚠️  项目未构建，建议先运行 npm run build', 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ 检查构建状态失败', 'red');
    return false;
  }
});

// 检查项目：验证git状态
addCheck('Git仓库状态', () => {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const hasChanges = status.trim().length > 0;

    if (!hasChanges) {
      log('✅ Git工作目录干净', 'green');
      return true;
    } else {
      log('⚠️  Git工作目录有未提交的更改', 'yellow');
      log('   建议在发布前提交所有更改', 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ 无法检查Git状态', 'red');
    return false;
  }
});

// 检查项目：验证npm登录状态
addCheck('npm登录状态', () => {
  try {
    const username = execSync('npm whoami', { encoding: 'utf8' }).trim();
    log(`✅ 已登录npm: ${username}`, 'green');
    return true;
  } catch (error) {
    log('❌ 未登录npm，请运行 npm login', 'red');
    return false;
  }
});

// 检查项目：验证包名可用性
addCheck('包名可用性', () => {
  const packages = ['playwright-kali', 'playwright-core-kali'];
  let allAvailable = true;

  for (const pkg of packages) {
    try {
      execSync(`npm view ${pkg}`, { stdio: 'pipe' });
      log(`⚠️  包 ${pkg} 已存在`, 'yellow');
      allAvailable = false;
    } catch (error) {
      log(`✅ 包 ${pkg} 可用`, 'green');
    }
  }

  return allAvailable;
});

// 检查项目：验证许可证
addCheck('许可证文件', () => {
  const licensePath = 'LICENSE';
  if (!fs.existsSync(licensePath)) {
    log('❌ LICENSE文件不存在', 'red');
    return false;
  }

  const content = fs.readFileSync(licensePath, 'utf8');
  const hasApacheLicense = content.includes('Apache License') || content.includes('Apache-2.0');

  if (hasApacheLicense) {
    log('✅ Apache-2.0许可证存在', 'green');
    return true;
  } else {
    log('❌ 缺少有效的Apache-2.0许可证', 'red');
    return false;
  }
});

// 主函数
function main() {
  log('🔍 Playwright Kali Linux - 发布前检查', 'bright');
  log('='.repeat(50), 'cyan');

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    log(`\n📋 检查: ${check.name}`, 'blue');
    try {
      if (check.fn()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`❌ 检查失败: ${error.message}`, 'red');
      failed++;
    }
  }

  // 输出总结
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 检查结果总结:', 'bright');
  log(`✅ 通过: ${passed}/${checks.length}`, 'green');
  log(`❌ 失败: ${failed}/${checks.length}`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\n🎉 所有检查通过，可以发布!', 'green');
    log('\n📝 下一步:', 'yellow');
    log('1. 运行构建: npm run build', 'yellow');
    log('2. 运行测试: npm test', 'yellow');
    log('3. 发布到npm: node scripts/publish.js', 'yellow');
    process.exit(0);
  } else {
    log('\n⚠️  请修复失败的检查项后再发布', 'yellow');
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log(`❌ 未捕获的异常: ${error.message}`, 'red');
  process.exit(1);
});

// 运行检查
main();