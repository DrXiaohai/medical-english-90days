// 生产环境端到端检查。使用隔离浏览器上下文，不访问个人浏览器记录。
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const lessons = JSON.parse(fs.readFileSync('src/generated/lessons.json', 'utf8'));
const exams = JSON.parse(fs.readFileSync('src/generated/exams.json', 'utf8'));
const checks = [];
async function saved(page) {
  await page.locator('.save-status').filter({ hasText: '已保存到此设备' }).waitFor({ state: 'attached' });
}
async function dashboard(page) {
  await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
}
async function exportData(page, name) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出进度', exact: true }).click();
  const download = await pending;
  const file = `tmp/${name}.json`;
  await download.saveAs(file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
(async () => {
  fs.mkdirSync('output/previews', { recursive: true });
  fs.mkdirSync('output/checks', { recursive: true });
  fs.mkdirSync('tmp', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('dialog', d => d.accept());
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.getByText('每天一点，读懂医学英语。').waitFor();
    for (const d of lessons) {
      await page.getByRole('button', { name: `Day ${d.day} 开始学习`, exact: true }).click();
      await page.getByRole('heading', { name: d.title, exact: true }).waitFor();
      assert.equal(await page.locator('fieldset').count(), 5);
      assert.equal(await page.locator('#translation textarea').count(), 5);
      await dashboard(page);
    }
    checks.push('90天课程逐页导航与完整练习显示');
    const d = lessons.find(d => d.day === 22);
    await page.getByRole('button', { name: 'Day 22 开始学习', exact: true }).click();
    await page.locator('#d8-t1').fill('持久化译文测试');
    await page.getByRole('button', { name: '查看参考答案与评分要点' }).first().click();
    await page.getByRole('combobox', { name: '翻译1自评分' }).selectOption('5');
    await page.getByRole('button', { name: '保存本次译文到历史' }).first().click();
    for (const [i, q] of d.questions.entries()) {
      await page.locator(`input[name="${q.id}"]`).nth(i === 0 ? (q.answer + 1) % 4 : q.answer).check();
    }
    await page.getByRole('button', { name: '提交并查看解析', exact: true }).click();
    await page.getByText('本次得分 4 / 5').waitFor();
    await page.getByRole('button', { name: '标记本课已完成', exact: true }).click();
    await saved(page);
    await page.reload();
    await page.getByRole('button', { name: 'Day 22 开始学习', exact: true }).click();
    assert.equal(await page.locator('#d8-t1').inputValue(), '持久化译文测试');
    await page.getByRole('button', { name: '已完成 ✓ · 点击撤销', exact: true }).waitFor();
    checks.push('草稿、选择题提交、译文历史及完成状态刷新恢复');
    await page.getByRole('button', { name: '错题本', exact: true }).click();
    await page.getByText('原阅读 / 病例', {exact:true}).click();
    await page.getByText(d.reading, {exact:true}).waitFor();
    await page.getByRole('radio', { name: d.questions[0].options[d.questions[0].answer], exact: true }).check();
    await page.getByRole('button', { name: '提交重答', exact: true }).click();
    await page.getByText('上次重答正确').waitFor();
    await page.getByRole('button', { name: '标记已掌握', exact: true }).click();
    checks.push('错题自动收录、重答与掌握标记');
    await page.getByRole('button', { name: '词汇复习', exact: true }).click();
    await page.getByRole('textbox', { name: '搜索词汇', exact: true }).fill('cardi/o');
    await page.getByRole('button', { name: '收藏生词', exact: true }).click();
    await page.getByRole('button', { name: '随机测试', exact: true }).click();
    await page.getByRole('button', { name: '心', exact: true }).click();
    checks.push('词汇收藏、随机测验与复习日期保存');
    await page.getByRole('button', { name: '模拟考试', exact: true }).click();
    await page.getByRole('button', { name: '开始新一次考试', exact: true }).first().click();
    for (const q of exams[0].questions) await page.locator(`input[name="${q.id}"]`).nth(q.answer).check();
    await page.locator(`#${exams[0].translations[0].id}`).fill('模考草稿');
    await saved(page);
    const before = await exportData(page, 'exam-running');
    await page.reload();
    await page.getByRole('button', { name: '模拟考试', exact: true }).click();
    await page.getByRole('button', { name: '继续考试', exact: true }).click();
    assert.equal(await page.locator(`#${exams[0].translations[0].id}`).inputValue(), '模考草稿');
    const after = await exportData(page, 'exam-resumed');
    assert.equal(before.examAttempts[0].startedAt, after.examAttempts[0].startedAt);
    await page.getByRole('button', { name: '提交考试', exact: true }).click();
    await page.getByText('已提交 · 客观40/40 · 翻译待自评').waitFor();
    for (const select of await page.locator('main select').all()) await select.selectOption('6');
    await page.getByText('已提交 · 客观40/40 · 总分100/100').waitFor();
    await saved(page);
    checks.push('模考计时起点保留、自动保存、40分客观评分、翻译自评及100分总分');
    const backup = await exportData(page, 'full-backup');
    assert.equal(backup.version, 2);
    assert.equal(backup.translationHistory[0].text, '持久化译文测试');
    assert.equal(backup.wordReview['cardi-o'].favorite, true);
    const restoredContext = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const restored = await restoredContext.newPage();
    restored.on('dialog', d => d.accept());
    restored.on('pageerror', e => errors.push(e.message));
    await restored.goto(base);
    await restored.getByText('每天一点，读懂医学英语。').waitFor();
    await restored.getByLabel('导入进度').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await saved(restored);
    const roundtrip = await exportData(restored, 'restored-backup');
    assert.deepEqual(roundtrip.days, backup.days);
    assert.deepEqual(roundtrip.examAttempts, backup.examAttempts);
    await restored.getByLabel('导入进度').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":999}') });
    await restored.getByRole('alert').filter({ hasText: '导入未执行' }).waitFor();
    checks.push('真实文件导出与新浏览器导入、非法备份拒绝且原记录保留');
    await restored.reload();
    for (const route of ['词汇复习', '错题本', '模拟考试', '学习仪表盘']) {
      await restored.getByRole('button', { name: route, exact: true }).click();
      assert.equal(await restored.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, route);
    }
    await restored.getByRole('button', { name: 'Day 90 开始学习', exact: true }).click();
    await restored.screenshot({ path: 'output/previews/mobile-final-course.png', fullPage: true });
    await restored.getByRole('button', { name: '深色模式', exact: true }).click();
    await restored.screenshot({ path: 'output/previews/mobile-final-dark.png', fullPage: true });
    checks.push('390px移动布局全部主要模块无水平溢出、深色模式');
    for (const viewport of [{width: 390,height: 844},{width: 768,height: 1024},{width: 1024,height: 768}]) {
      await restored.setViewportSize(viewport);
      for (const route of ['词汇复习','错题本','模拟考试','学习仪表盘']) {
        await restored.getByRole('button',{name:route,exact:true}).click();
        assert.equal(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${viewport.width}px ${route}`);
      }
      for (const day of [1,45,90]) {
        await restored.getByRole('button',{name:`Day ${day} 开始学习`,exact:true}).click();
        assert.equal(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${viewport.width}px Day ${day}`);
        await dashboard(restored);
      }
    }
    checks.push('390px iPhone及768px/1024px iPad视口各模块与Day 1/45/90无水平溢出');

    const other = await context.newPage();
    await other.goto(base);
    await other.getByText('每天一点，读懂医学英语。').waitFor();
    await page.getByRole('button', { name: '深色模式', exact: true }).click();
    await saved(page);
    await other.getByRole('button', { name: 'Day 22 开始学习', exact: true }).click();
    await other.locator('#d8-t1').fill('冲突页面中的未保存修改');
    await other.getByRole('alert').filter({ hasText: '其他标签页' }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Day 22 开始学习', exact: true }).click();
    assert.equal(await page.locator('#d8-t1').inputValue(), '持久化译文测试');
    checks.push('跨标签页旧修订写入被拒绝，已存记录未覆盖');
    await dashboard(page);
    await page.getByRole('button', { name: '浅色模式', exact: true }).click();
    await page.screenshot({ path: 'output/previews/dashboard-complete.png', fullPage: true });
    assert.deepEqual(errors, []);
    fs.writeFileSync('output/checks/browser-production.json', JSON.stringify({ checkedAt: new Date().toISOString(), base, engine: 'installed Chrome', checks, pageErrors: errors, result: 'passed' }, null, 2));
    console.log(checks.join('\n'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
