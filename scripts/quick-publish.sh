#!/bin/bash

# Playwright Kali Linux - 快速发布脚本
# 这是简化的bash版本，用于快速发布

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 配置
NAME_SUFFIX="-kali"
VERSION_SUFFIX=".11"

# 日志函数
log() {
    echo -e "${2:-$NC}$1${NC}"
}

error() {
    log "❌ $1" "$RED"
    exit 1
}

success() {
    log "✅ $1" "$GREEN"
}

warning() {
    log "⚠️  $1" "$YELLOW"
}

info() {
    log "ℹ️  $1" "$BLUE"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 未安装"
    fi
}

# 检查npm登录
check_npm_login() {
    if ! npm whoami &> /dev/null; then
        error "请先登录npm: npm login"
    fi
    success "已登录npm: $(npm whoami)"
}

# 检查包名可用性
check_package_availability() {
    local package_name="$1"
    if npm view "$package_name" &> /dev/null; then
        warning "包 $package_name 已存在"
        return 1
    else
        success "包 $package_name 可用"
        return 0
    fi
}

# 更新package.json
update_package_json() {
    local package_dir="$1"
    local package_name="$2"
    local new_package_name="${package_name}${NAME_SUFFIX}"

    info "更新 $package_name 的package.json..."

    cd "$package_dir"

    # 备份原始文件
    cp package.json package.json.backup

    # 更新包名
    sed -i "s/\"name\": \"playwright-core\"/\"name\": \"playwright-core${NAME_SUFFIX}\"/" package.json
    sed -i "s/\"name\": \"playwright\"/\"name\": \"playwright${NAME_SUFFIX}\"/" package.json

    # 更新版本
    sed -i "s/-next$/${VERSION_SUFFIX}/" package.json

    # 添加发布配置
    if ! grep -q '"publishConfig"' package.json; then
        sed -i 's/\"license\": \"Apache-2.0\"/\"license\": \"Apache-2.0\",\n  \"publishConfig\": {\n    \"access\": \"public\"\n  }/' package.json
    fi

    # 更新依赖
    if grep -q '"playwright-core"' package.json; then
        sed -i "s/\"playwright-core\": \".*\"/\"playwright-core\": \"playwright-core${VERSION_SUFFIX}\"/" package.json
    fi

    success "package.json 更新完成"
}

# 恢复package.json
restore_package_json() {
    local package_dir="$1"
    cd "$package_dir"

    if [ -f "package.json.backup" ]; then
        mv package.json.backup package.json
        info "已恢复原始package.json"
    fi
}

# 发布包
publish_package() {
    local package_name="$1"
    local package_dir="packages/$package_name"
    local new_package_name="${package_name}${NAME_SUFFIX}"

    log "\n📦 发布包: $package_name -> $new_package_name" "$BOLD$CYAN"

    # 检查目录存在
    if [ ! -d "$package_dir" ]; then
        error "包目录不存在: $package_dir"
    fi

    # 检查包名可用性
    if ! check_package_availability "$new_package_name"; then
        read -p "包已存在，是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            warning "跳过 $package_name"
            return 1
        fi
    fi

    # 更新package.json
    update_package_json "$package_dir" "$package_name"

    # 验证包
    cd "$package_dir"
    info "验证包..."
    npm pack --dry-run > /dev/null
    success "包验证通过"

    # 确认发布
    if [ "$DRY_RUN" = "true" ]; then
        warning "干运行模式: $new_package_name"
        restore_package_json "$package_dir"
        return 0
    fi

    read -p "确认发布 $new_package_name? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "取消发布 $package_name"
        restore_package_json "$package_dir"
        return 1
    fi

    # 发布
    info "发布到npm..."
    if npm publish --access public; then
        success "$new_package_name 发布成功!"
        restore_package_json "$package_dir"
        return 0
    else
        error "发布失败"
        restore_package_json "$package_dir"
        return 1
    fi
}

# 主函数
main() {
    log "🚀 Playwright Kali Linux - 快速发布脚本" "$BOLD$CYAN"
    log "$(printf '=%.0s' {1..50})" "$CYAN"

    # 检查环境
    info "检查环境..."
    check_command "npm"
    check_npm_login

    # 显示警告
    if [ "$DRY_RUN" != "true" ]; then
        warning "这是对Microsoft Playwright的修改版本"
        warning "请确保您有发布权限"
        echo

        read -p "继续发布? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "发布已取消"
        fi
    fi

    # 发布包
    local packages=("playwright-core" "playwright")
    local successful=()
    local failed=()

    for package in "${packages[@]}"; do
        if publish_package "$package"; then
            successful+=("$package")
        else
            failed+=("$package")
        fi
    done

    # 显示结果
    echo
    log "📊 发布结果:" "$BOLD"
    log "$(printf '-%.0s' {1..30})" "$CYAN"

    if [ ${#successful[@]} -gt 0 ]; then
        success "成功发布的包:"
        for package in "${successful[@]}"; do
            echo "   - ${package}${NAME_SUFFIX}"
        done
    fi

    if [ ${#failed[@]} -gt 0 ]; then
        error "发布失败的包:"
        for package in "${failed[@]}"; do
            echo "   - $package"
        done
    fi

    if [ "$DRY_RUN" != "true" ] && [ ${#successful[@]} -gt 0 ]; then
        echo
        log "📝 发布后任务:" "$YELLOW"
        echo "1. 创建Git标签: git tag -a v1.57${VERSION_SUFFIX} -m \"Playwright with Kali Linux support\""
        echo "2. 推送标签: git push origin v1.57${VERSION_SUFFIX}"
        echo "3. 创建GitHub Release"
        echo "4. 测试安装: npm install playwright${NAME_SUFFIX}"
        echo "5. 更新文档"
    fi

    echo
    log "🎉 脚本执行完成!" "$BOLD"

    # 设置退出码
    if [ ${#failed[@]} -gt 0 ]; then
        exit 1
    fi
}

# 处理中断信号
trap 'error "脚本被中断"' INT TERM

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help|-h)
            echo "用法: $0 [--dry-run]"
            echo
            echo "选项:"
            echo "  --dry-run  仅执行干运行，不实际发布"
            echo "  --help     显示此帮助信息"
            exit 0
            ;;
        *)
            error "未知参数: $1"
            ;;
    esac
done

# 运行主函数
main