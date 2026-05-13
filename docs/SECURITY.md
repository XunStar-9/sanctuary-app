# 安全策略 (Security Policy)

## 分支保护规则配置指南

为了保护 `main` 分支的代码质量和安全性，请在 GitHub 仓库设置中配置以下分支保护规则：

### 配置路径

**Settings → Branches → Add branch protection rule**

### 推荐配置

| 设置项 | 推荐值 | 说明 |
|--------|--------|------|
| Branch name pattern | `main` | 保护主分支 |
| Require a pull request before merging | ✅ 启用 | 禁止直接推送到 main |
| Require approvals | ✅ 至少 1 人 | 至少需要 1 位审查者批准 |
| Dismiss stale pull request approvals | ✅ 启用 | 代码更新后需重新审查 |
| Require status checks to pass | ✅ 启用 | CI 必须通过才能合并 |
| Required status checks | `Build Android APK`, `Secret Detection`, `CodeQL Analysis` | 必须通过的检查 |
| Require branches to be up to date | ✅ 启用 | 合并前必须是最新状态 |
| Require conversation resolution | ✅ 启用 | 所有评论必须解决 |
| Include administrators | ✅ 启用 | 管理员也必须遵守规则 |
| Allow force pushes | ❌ 禁用 | 禁止强制推送 |
| Allow deletions | ❌ 禁用 | 禁止删除受保护分支 |

### 手动配置步骤

1. 进入仓库页面 → **Settings**
2. 左侧菜单选择 **Branches**
3. 点击 **Add branch protection rule**
4. 在 "Branch name pattern" 中输入 `main`
5. 按照上表勾选对应选项
6. 点击 **Create** 保存

---

## Secrets 管理最佳实践

### 绝对不要在代码中硬编码的信息

- API 密钥 (API Keys)
- 数据库连接字符串
- OAuth Client Secret
- 签名证书和私钥
- 第三方服务 Token
- 环境变量中的敏感信息

### 使用 GitHub Secrets

**配置路径:** Settings → Secrets and variables → Actions

#### 推荐的 Secrets 命名规范

```
# 生产环境
PROD_API_KEY
PROD_DATABASE_URL
PROD_SIGNING_KEY

# 开发/测试环境
DEV_API_KEY
DEV_DATABASE_URL

# 第三方服务
FIREBASE_CONFIG
SENTRY_DSN
```

#### 在工作流中使用 Secrets

```yaml
jobs:
  build:
    steps:
      - name: Build with secrets
        env:
          API_KEY: ${{ secrets.PROD_API_KEY }}
        run: echo "Using secret safely"
```

#### 安全注意事项

1. **不要在日志中打印 secrets** - GitHub 会自动遮蔽，但仍需小心
2. **使用 environment secrets** - 对于不同环境（production/staging）使用不同的 secrets
3. **定期轮换** - 每 90 天更换一次敏感密钥
4. **最小权限** - 每个 secret 仅给需要它的工作流使用

---

## Token 管理

### Personal Access Token (PAT) 建议

| 建议 | 说明 |
|------|------|
| 使用 Fine-grained PAT | 比 Classic Token 更安全，可限定仓库范围 |
| 设置过期时间 | 建议 90 天，最长不超过 1 年 |
| 最小权限原则 | 仅授予必要的权限 |
| 不要共享 Token | 每人/每服务使用独立 Token |

### Token 过期提醒

建议在日历中设置提醒，在 Token 过期前 1 周进行轮换。

---

## 安全漏洞报告

如果发现安全漏洞，请通过以下方式报告：

1. **不要**创建公开的 Issue
2. 通过 GitHub Security Advisory 私密报告（Settings → Security → Advisories → New draft）
3. 或直接联系仓库维护者

---

## 自动化安全检查

本仓库已配置以下自动化安全措施：

- ✅ **Dependabot** - 自动检测依赖漏洞并创建更新 PR
- ✅ **Gitleaks** - 检测代码中意外提交的密钥
- ✅ **CodeQL** - 静态代码分析，发现潜在安全问题
- ✅ **npm audit** - 依赖安全审计
- ✅ **CODEOWNERS** - 关键文件修改需指定人员审查
