# 不瞎练训练实验室｜P0 中文版

面向 iPhone 的离线优先 PWA。训练时把手机放一边，每 10 球只记录一次成绩。结果保存在当前设备浏览器的 IndexedDB，不设账号、不接后端、不做云同步。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

终端会显示本地访问地址。浏览器使用 `http://localhost:5173`。

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物在 `dist/`。静态托管请发布整个 `dist` 目录。Vite 配置使用相对资源路径，可部署在站点根目录或 GitHub Pages 项目子路径。

## 部署到 GitHub Pages

1. 将项目推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 **Settings → Pages** 中将发布源设为 **GitHub Actions**。
3. 项目已包含 `.github/workflows/deploy.yml`；每次推送到 `main` 会自动构建并部署，也可以在 Actions 页面手动运行。
4. 部署完成后，用 Safari 打开 GitHub Pages 提供的网址。

Vite 的 `base: './'` 使用相对路径，因此项目仓库位于 `用户名.github.io/仓库名/` 时也能加载资源。不要把发布目录设为项目根目录；必须发布构建后的 `dist/`。

## 部署到 Vercel

1. 在 Vercel 导入 GitHub 仓库。
2. Framework Preset 选择 **Vite**。
3. Build Command 填 `npm run build`，Output Directory 填 `dist`。
4. 部署后用 Safari 打开生成的网址。

也可以从命令行执行 `npx vercel`，按提示关联项目；正式构建使用 `npm run build`。

## 安装到 iPhone 主屏幕

1. 在 iPhone 上用 Safari 打开部署网址并等待首次加载完成。
2. 点分享按钮，选择“添加到主屏幕”。
3. 确认名称后点“添加”，之后从主屏幕图标打开。

先联网打开一次，Service Worker 会缓存应用外壳与访问过的资源。之后可离线打开已缓存版本。应用不会在训练过程中自动刷新；新版本在关闭后续打开时由浏览器更新。

## 数据说明

训练历史、发球机设置和新手引导状态存放在本机 IndexedDB。关闭 App 或浏览器后仍在。浏览器“清除网站数据”会删除这些记录；P0 不提供跨设备同步或云端备份。

## 产品范围

包含 IPTPA L2 第三拍放小球四组训练、重置球单变量实验、发球机设置、训练历史与内置使用说明。暂不包含 AI 自动诊断、逐球识别、Apple Watch、云同步、复杂图表或全部 23 项训练。
