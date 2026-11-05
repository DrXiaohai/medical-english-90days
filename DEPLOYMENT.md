# GitHub Pages部署

平台使用React、TypeScript和Vite，课程随JavaScript静态打包。浏览器直接运行dist文件；开发服务和Python只在本地开发或Actions构建时使用。

## 首次发布

1. 在GitHub创建目标仓库，保留main作为部署分支。仓库可见性由所有者选择，Pages支持情况取决于账号方案。
2. 在仓库Settings → Pages → Build and deployment将Source设置为GitHub Actions。
3. 本地运行npm run prepare:github，检查终端给出的生成目录及publish_output/publication-review.json。重复执行时默认创建带序号的新目录。上传范围为清单内课程和代码。
4. 使用GitHub插件、已登录的GitHub CLI或GitHub Desktop，将生成目录中的内容提交到目标仓库根目录，包括.github/workflows/deploy-pages.yml。
5. Actions通过内容校验、测试、构建及静态产物检查后部署。实际网址显示在仓库Pages设置和工作流的github-pages环境中。

如使用命令行，先进入生成目录并完成GitHub授权，再根据真实仓库替换地址。

```bash
git init -b main
git add .
git commit -m "Deploy 90-day medical English platform"
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

当前工作流使用GitHub提供的GITHUB_TOKEN和OIDC权限，不需要把个人令牌写入课程或前端。部署任务只请求Pages和身份令牌写权限，构建任务使用代码与Pages元数据读取权限。

## 路径与路由

GitHub项目站点的路径为/repository/，用户站点或自定义域名通常使用/。工作流从actions/configure-pages取得base_path，在构建时设置VITE_BASE_PATH。仓库改名后重新运行部署即可。

日课与各工具当前使用React状态切换，页内锚点采用#链接。刷新访问站点入口即可；无需在Pages上增加服务器路由规则。课程JSON为构建输入，90天内容和四套模考已打包，运行时不从本地文件系统读取课程。

本地模拟项目路径。

```bash
VITE_BASE_PATH=/medical-english/ npm run build
VITE_BASE_PATH=/medical-english/ npm run verify:pages
VITE_BASE_PATH=/medical-english/ npm run preview -- --port 4174
```

然后访问http://127.0.0.1:4174/medical-english/。本地根路径构建可直接运行npm run build。

## iPhone和iPad

发布成功后，在Safari打开实际Pages网址，点击分享，再选择“添加到主屏幕”。图标、启动地址、语言和独立窗口显示方式由manifest.webmanifest及Apple图标定义。

当前已准备Manifest和图标，尚无Service Worker缓存。离线冷启动与自动缓存更新需要后续PWA功能。未来Service Worker应通过Vite BASE_URL生成注册地址和scope，并采用按发布版本区分的缓存；缓存只处理静态资源，学习记录继续使用IndexedDB。

## 学习记录

记录保存在浏览器IndexedDB，刷新后可继续使用。站点发布不会把个人作答上传到GitHub。

本地地址与GitHub Pages属于不同来源，记录需要使用现有JSON导出/导入功能转移。Mac、iPhone、iPad也需分别转移记录。固定使用同一网址。一个账号下不同项目路径可能共享同一来源，当前固定数据库名适合本平台单实例使用。

## 后续更新

在仓库内修改curriculum或exams的源Markdown。需要改变题意时创建新题目ID，文字订正保持ID。运行npm run validate、npm test和npm run build，提交并推送main后，Actions自动重新部署。

课程和代码更新会继续读取既有稳定ID下的浏览器记录。发布前可以导出学习JSON备份。

## 拟公开范围

准备脚本采用明确目录与文件清单，包含90天课程、四套试卷、前端、必要构建脚本、测试及部署说明。课程中的患者场景为原创教学短病例，现有材料中未使用实名病历。

本机报告、调试导出、学习备份、压缩包、PDF、字体文件和依赖目录不进入生成目录。扫描会检查疑似令牌、密码、私钥、联系方式、身份信息及学习记录文件；发现匹配项即中止。模式扫描不能替代原始素材来源和公开授权审核。

公开仓库和公开站点会使课程、题目与参考答案可被访问。确认拟公开内容后再推送。

## 官方依据

- [Vite GitHub Pages部署](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub Pages自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [configure-pages路径输出](https://github.com/actions/configure-pages/blob/main/action.yml)
