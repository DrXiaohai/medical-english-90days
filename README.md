# 90天医学英语学习平台

医学研究生的内科英语课程、词汇复习、双向翻译、错题与综合模拟考试。采用React、TypeScript、Vite，核心学习流程无需账号或在线AI服务。

## 内容与功能

90天课程，455个独立词汇，530道客观题，490道翻译，四套综合模考。课程和题目为原创配套材料，教材仅依据The Language of Medicine, 10th Edition目录定位。

支持词卡翻转、收藏与间隔复习、选择题评分、翻译自评及历史、错题重答、考试计时及成绩历史、学习仪表盘、浏览器本地保存、JSON备份与恢复。

## 本地使用

```bash
npm ci
npm run dev
```

在终端显示的地址打开页面。构建和验证命令如下。

```bash
npm run validate
npm test
npm run build
npm run verify:pages
npm run preview
```

## 发布及更新

[部署说明](DEPLOYMENT.md)包括GitHub授权、Pages设置、自动部署、项目路径和移动设备使用。main分支更新后，Actions自动验证并部署dist。

[90天计划](STUDY_PLAN.md)、[内容审查](content_review/REVIEW.md)和[医学背景来源](content_review/SOURCES.md)可用于了解课程范围。

学习记录保存在当前浏览器，跨设备可导出并导入JSON。原有记录使用稳定课程ID。首次联网并等待缓存提示完成后可离线学习及重开，包含90课与四套模考。教材正文未逐页核对，课程仍需实际试学与医学英语教师审阅。

## 离线使用

联网打开后，等待“90天课程已缓存，可离线学习”。iPhone/iPad可添加到主屏幕，并从图标联网确认一次缓存。以后可断网进入课程；新版本缓存就绪后关闭全部课程窗口再重开。详见[离线与更新说明](docs/OFFLINE.md)。
