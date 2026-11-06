import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  lessons,
  program,
  newDay,
  newProgress,
  grade,
  vocabulary,
  wrongQuestions,
  makeId,
  parseBackup,
  mergeProgress,
  type Lesson,
  type Progress,
  type DayProgress,
} from "./model";
import { readSnapshot, saveProgress } from "./storage";
import {
  VocabularyReview,
  WrongBook,
  ExamCenter,
  LearningStats,
} from "./StudyTools";
import "./styles.css";
import { OfflineStatus } from "./OfflineStatus";
import referenceData from "../content_review/references.json";
const references: Record<string, { title: string; url: string }> =
  referenceData;

export function App() {
  const [progress, setProgress] = useState<Progress>(newProgress);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("正在读取本地记录…");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const revision = useRef(0);
  const saveBlocked = useRef(false);
  const [active, setActive] = useState<number | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const progressRef = useRef(progress);
  useEffect(() => {
    readSnapshot()
      .then(({ progress: p, revision: r }) => {
        revision.current = r;
        progressRef.current = p;
        setProgress(p);
        setReady(true);
        setStatus("本地记录已载入");
      })
      .catch(() =>
        setError(
          "无法读取 IndexedDB。请允许网站存储后刷新，避免覆盖已有记录。",
        ),
      );
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme;
  }, [progress.theme]);
  function update(fn: (p: Progress) => Progress) {
    const next = fn(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    // 串行提交，防止连续输入的旧快照覆盖新快照。
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        if (saveBlocked.current)
          throw new Error("保存已暂停，请导出当前进度并刷新后导入。");
        revision.current = await saveProgress(next, revision.current);
      })
      .then(() => {
        setStatus("已保存到此设备");
        setError("");
      })
      .catch((e: Error) => {
        saveBlocked.current = true;
        setStatus("保存失败");
        setError(e.message + " 当前修改可导出备份。");
      });
    setStatus("正在保存…");
  }
  function updateDay(id: string, fn: (d: DayProgress) => DayProgress) {
    update((p) => ({
      ...p,
      days: { ...p.days, [id]: fn(p.days[id] ?? newDay()) },
    }));
  }
  const lesson = lessons.find((d) => d.day === active);
  const done = lessons.filter((d) => progress.days[d.id]?.completed).length;
  const attempted = lessons.filter((d) => progress.days[d.id]?.submitted);
  const correct = attempted.reduce(
    (n, d) => n + grade(d, progress.days[d.id].answers),
    0,
  );
  const known = vocabulary.filter(
    (v) => progress.words[v.id] === "known",
  ).length;
  const totalQuestions = attempted.reduce((n, d) => n + d.questions.length, 0);
  const weak = [
    ...new Set(
      attempted.flatMap((d) =>
        d.questions
          .filter((q) => progress.days[d.id].answers[q.id] !== q.answer)
          .map((q) => q.tag),
      ),
    ),
  ];
  function backup() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicine-english-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 20000000) throw new Error("备份超过20MB限制");
      const incoming = parseBackup(await file.text());
      if (
        !window.confirm(
          "导入将合并记录。同ID冲突保留本机记录，历史按ID去重合并。继续？",
        )
      )
        return;
      update((p) => mergeProgress(p, incoming));
    } catch (e) {
      setError("导入未执行：" + (e as Error).message);
    }
  }
  function openDay(day: number) {
    setTab("dashboard");
    setActive(day);
  }
  return (
    <>
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("dashboard");
            setActive(null);
          }}
        >
          IM<span>ENGLISH</span>
        </a>
        <div className="header-title">
          内科英语研习室<small>Internal Medicine English</small>
        </div>
        <div className="header-actions">
          <button
            disabled={!ready}
            onClick={() =>
              update((p) => ({
                ...p,
                theme: p.theme === "light" ? "dark" : "light",
              }))
            }
          >
            {progress.theme === "light" ? "深色模式" : "浅色模式"}
          </button>
          <button disabled={!ready} onClick={backup}>
            导出进度
          </button>
          <label className="file-button">
            导入进度
            <input
              type="file"
              accept="application/json,.json"
              disabled={!ready}
              onChange={(e) => {
                void importBackup(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </header>
      <OfflineStatus />
      <div className="shell">
        <aside>
          <p className="eyebrow">YOUR STUDY SPACE</p>
          <button
            className={
              tab === "dashboard" && active === null ? "nav selected" : "nav"
            }
            onClick={() => {
              setTab("dashboard");
              setActive(null);
            }}
          >
            学习仪表盘
          </button>
          {[
            ["vocabulary", "词汇复习"],
            ["wrong", "错题本"],
            ["exams", "模拟考试"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "nav selected" : "nav"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <p className="sidebar-label">快捷课程</p>
          {lessons
            .filter((d) => [1, 22, 32].includes(d.day))
            .map((d) => (
              <button
                key={d.id}
                className={
                  tab === "dashboard" && active === d.day
                    ? "nav selected"
                    : "nav"
                }
                onClick={() => openDay(d.day)}
              >
                Day {d.day}{" "}
                <span>
                  {d.day === 1
                    ? "医学构词"
                    : d.id === "day-08"
                      ? "心血管系统"
                      : "呼吸系统"}
                </span>
                {progress.days[d.id]?.completed ? " ✓" : ""}
              </button>
            ))}
          <div className="sidebar-note">
            12周＋6天缓冲 · 标准90分钟/天
            <br />
            {lessons.length}课 / 90天计划
            <br />
            教材、翻译与复习闭环
          </div>
          <p className="save-status" role="status">
            {status}
          </p>
        </aside>
        <main>
          {error && (
            <div role="alert" className="alert">
              {error}
            </div>
          )}
          {!ready ? (
            <p>正在准备学习空间。若持续无法载入，请检查浏览器网站存储权限。</p>
          ) : tab === "vocabulary" ? (
            <VocabularyReview progress={progress} update={update} />
          ) : tab === "wrong" ? (
            <WrongBook progress={progress} update={update} />
          ) : tab === "exams" ? (
            <ExamCenter progress={progress} update={update} />
          ) : lesson ? (
            <LessonPage
              key={lesson.id}
              lesson={lesson}
              state={progress.days[lesson.id] ?? newDay()}
              words={progress.words}
              updateDay={(fn) => updateDay(lesson.id, fn)}
              markWord={(id, state) =>
                update((p) => ({ ...p, words: { ...p.words, [id]: state } }))
              }
              progress={progress}
              update={update}
              back={() => setActive(null)}
            />
          ) : (
            <>
              <section className="hero">
                <div>
                  <p className="eyebrow">90-DAY TEXTBOOK STUDY PROGRAM</p>
                  <h1>每天一点，读懂医学英语。</h1>
                  <p>
                    从术语到病例，从理解到表达。
                    <br />
                    以教材为主线，结合原书练习与翻译训练。
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      openDay(
                        lessons.find((d) => !progress.days[d.id]?.completed)
                          ?.day ?? 1,
                      )
                    }
                  >
                    继续学习 <span>→</span>
                  </button>
                </div>
                <div className="hero-number">
                  90<small>DAYS TO EXPLORE</small>
                </div>
              </section>
              <section className="stats">
                <article>
                  <span>90天学习进度</span>
                  <strong>
                    {done}
                    <small> / {program.totalDays} 计划日</small>
                  </strong>
                  <progress value={done} max={program.totalDays} />
                </article>
                <article>
                  <span>待复习错题</span>
                  <strong>
                    {
                      wrongQuestions(progress).filter(
                        (x) => !progress.wrongReview[x.question.id]?.mastered,
                      ).length
                    }
                    <small> 题</small>
                  </strong>
                  <p>自动收录客观题错误</p>
                </article>
                <article>
                  <span>词汇掌握</span>
                  <strong>
                    {Math.round((known / vocabulary.length) * 100)}
                    <small>%</small>
                  </strong>
                  <p>
                    {known} / {vocabulary.length} 个独立词汇
                  </p>
                </article>
                <article>
                  <span>选择题正确率</span>
                  <strong>
                    {attempted.length
                      ? Math.round((correct / totalQuestions) * 100) + "%"
                      : "—"}
                  </strong>
                  <p>
                    {correct} / {totalQuestions} 道已提交题目
                  </p>
                </article>
              </section>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">YOUR LEARNING PATH</p>
                  <h2>90天教材学习路线</h2>
                </div>
                <span className="badge">{lessons.length}份课程已开放</span>
              </div>
              <div className="week-grid">
                {program.weeks.map((w, i) => (
                  <article className="week" key={w.title}>
                    <span className="week-number">
                      WEEK {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{w.title}</h3>
                    <p>
                      {w.goal} ·{" "}
                      {w.estimatedPages
                        ? `约${w.estimatedPages}页`
                        : "缓冲复习"}
                    </p>
                    <div className="days">
                      {w.days.map((day) => (
                        <button
                          key={day}
                          disabled={!lessons.some((d) => d.day === day)}
                          className={
                            progress.days[
                              lessons.find((d) => d.day === day)?.id ?? ""
                            ]?.completed
                              ? "done"
                              : ""
                          }
                          onClick={() => openDay(day)}
                          aria-label={`Day ${day}${lessons.some((d) => d.day === day) ? " 开始学习" : " 待编写"}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <small>
                      已完成
                      {
                        w.days.filter(
                          (day) =>
                            progress.days[
                              lessons.find((d) => d.day === day)?.id ?? ""
                            ]?.completed,
                        ).length
                      }
                      /{w.days.length}天
                    </small>
                  </article>
                ))}
              </div>
              <section className="reflection">
                <h2>先校准教材学习速度</h2>
                <p>
                  核心13章约527页，72个推进日平均约7.3页/日。前3次按45分钟精读记录实际速度，第7天评估可行性。选学Ch.10、19、20视余量安排。
                </p>
                <h2>本次复习重点</h2>
                <p>
                  {weak.length
                    ? "建议回顾已提交题目中的这些知识点：" + weak.join("、")
                    : "提交选择题后，这里会根据实际错题显示需要复习的知识点。"}
                </p>
                <p>翻译题采用参考译文与评分要点自评，允许合理同义表达。</p>
              </section>
              <LearningStats progress={progress} update={update} />
            </>
          )}
          <footer>
            原创教材配套复习材料 · 教材页码仅据目录定位 · 进度保存在当前浏览器
          </footer>
        </main>
      </div>
    </>
  );
}
function LessonPage({
  lesson: d,
  state,
  words,
  updateDay,
  markWord,
  back,
  progress,
  update,
}: {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  lesson: Lesson;
  state: DayProgress;
  words: Progress["words"];
  updateDay: (fn: (d: DayProgress) => DayProgress) => void;
  markWord: (id: string, state: "learning" | "known") => void;
  back: () => void;
}) {
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  function restartLesson() {
    if (
      !window.confirm(
        "重新学习会清空本课当前作答和完成标记，译文将归档，词汇掌握记录保留。继续？",
      )
    )
      return;
    update((p) => {
      const saved = p.days[d.id] ?? newDay();
      const history = d.translations
        .filter((t) => saved.drafts[t.id]?.trim())
        .map((t) => ({
          id: makeId(),
          lessonId: d.id,
          questionId: t.id,
          at: new Date().toISOString(),
          text: saved.drafts[t.id],
          score: saved.selfScores[t.id],
        }));
      const retainedDrafts = { ...saved.drafts };
      for (const question of d.translations) delete retainedDrafts[question.id];
      return {
        ...p,
        days: {
          ...p.days,
          [d.id]: {
            ...newDay(),
            drafts: retainedDrafts,
          },
        },
        translationHistory: [...p.translationHistory, ...history],
      };
    });
    setCard(0);
    setFlipped(false);
    setRevealed({});
  }
  const reference = references[d.chapter.match(/Ch\.(\d+)/)?.[1] ?? ""];
  const v = d.vocabulary[card];
  const allAnswered = d.questions.every(
    (q) => state.answers[q.id] !== undefined,
  );
  return (
    <>
      <button className="back" onClick={back}>
        ← 返回学习路线
      </button>
      <button onClick={restartLesson}>重新学习本课</button>
      <p className="eyebrow">
        DAY {String(d.day).padStart(2, "0")} · 60–90 MIN
      </p>
      <h1>{d.title}</h1>
      <p className="muted">
        {d.chapter} · {d.pages}
      </p>
      <p className="source-note">{d.sourceNote}</p>
      <nav className="anchors">
        <a href="#textbook">教材学习</a>
        <a href="#vocabulary">词汇</a>
        <a href="#reading">知识与阅读</a>
        <a href="#quiz">选择题</a>
        <a href="#translation">翻译</a>
        <a href="#checklist">复习清单</a>
      </nav>
      <section className="panel">
        <h2>今天的学习目标</h2>
        <ul>
          {d.objectives.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p>{d.schedule.short}</p>
        <p>{d.schedule.standard}</p>
        <p>{d.schedule.workload}</p>
      </section>
      <section className="panel" id="textbook">
        <p className="eyebrow">
          READ YOUR TEXTBOOK ·{" "}
          {d.kind === "review"
            ? "15–20 MIN REVIEW"
            : "45 MIN + 15 MIN PRACTICE"}
        </p>
        <h2>The Language of Medicine · 教材学习</h2>
        <p>
          <b>{d.textbookStudy.book}</b>
        </p>
        <p>
          {d.textbookStudy.chapter} · 电子书导航起点 {d.textbookStudy.startPage}
        </p>
        <p>{d.textbookStudy.focus}</p>
        <ol>
          {d.textbookStudy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>
          <b>阅读产出</b> {d.textbookStudy.output}
        </p>
        <p>
          <b>合书自测</b> {d.textbookStudy.review}
        </p>
        <p className="source-note">{d.textbookStudy.note}</p>
        <label htmlFor="textbook-notes">教材学习笔记</label>
        <textarea
          id="textbook-notes"
          value={state.drafts["textbook-notes"] ?? ""}
          placeholder="记录实际阅读页码、例词或结构、自己的理解及待查问题…"
          onChange={(e) =>
            updateDay((p) => ({
              ...p,
              drafts: { ...p.drafts, "textbook-notes": e.target.value },
            }))
          }
        />
      </section>
      <section className="panel" id="vocabulary">
        <div className="section-heading">
          <h2>医学词汇卡</h2>
          <button
            onClick={() => {
              setReverse(!reverse);
              setFlipped(false);
            }}
          >
            {reverse ? "切换为英→中" : "切换为中→英"}
          </button>
        </div>
        <p>
          {card + 1} / {d.vocabulary.length} ·{" "}
          {words[v.id] === "known" ? "已掌握" : "学习中"}
        </p>
        <button
          className="flashcard"
          aria-label="翻转词汇卡"
          onClick={() => setFlipped(!flipped)}
        >
          <strong>
            {flipped
              ? reverse
                ? v.english
                : v.chinese
              : reverse
                ? v.chinese
                : v.english}
          </strong>
          {flipped ? (
            <>
              <span>
                {v.pos} · {v.morphology}
              </span>
              <span>{v.example}</span>
              <span>{v.translation}</span>
            </>
          ) : (
            <span>点击查看释义与例句</span>
          )}
        </button>
        <div className="row">
          <button
            disabled={card === 0}
            onClick={() => {
              setCard(card - 1);
              setFlipped(false);
            }}
          >
            上一词
          </button>
          <button onClick={() => markWord(v.id, "learning")}>还需复习</button>
          <button onClick={() => markWord(v.id, "known")}>已掌握</button>
          <button
            disabled={card === d.vocabulary.length - 1}
            onClick={() => {
              setCard(card + 1);
              setFlipped(false);
            }}
          >
            下一词
          </button>
        </div>
      </section>
      <section className="panel" id="reading">
        <h2>常用表达</h2>
        {d.expressions.map(([a, b]) => (
          <p key={a}>
            <b>{a}</b> — {b}
          </p>
        ))}
        <h2>核心知识</h2>
        <p className="prose">{d.core}</p>
        <h2>英文阅读 / 病例</h2>
        <p className="english prose">{d.reading}</p>
        {reference && (
          <p className="source-note">
            模块延伸阅读（覆盖部分基础主题）{" "}
            <a href={reference.url} target="_blank" rel="noreferrer">
              {reference.title}
            </a>
          </p>
        )}
      </section>
      <section className="panel" id="quiz">
        <h2>选择题 · 先独立作答</h2>
        {d.questions.map((q, i) => (
          <fieldset key={q.id}>
            <legend>
              {i + 1}. {q.stem}
            </legend>
            {q.options.map((o, j) => (
              <label className="option" key={o}>
                <input
                  type="radio"
                  name={q.id}
                  checked={state.answers[q.id] === j}
                  disabled={state.submitted}
                  onChange={() =>
                    updateDay((p) => ({
                      ...p,
                      answers: { ...p.answers, [q.id]: j },
                    }))
                  }
                />
                <span>
                  {String.fromCharCode(65 + j)}. {o}
                </span>
              </label>
            ))}
            {state.submitted && (
              <div className="answer">
                {state.answers[q.id] === q.answer ? "✓ 正确" : "需复习"} · 答案{" "}
                {String.fromCharCode(65 + q.answer)}
                <p>{q.explanation}</p>
              </div>
            )}
          </fieldset>
        ))}
        {state.submitted ? (
          <div role="status">
            <strong>本次得分 {grade(d, state.answers)} / 5</strong>
            <button
              className="retry"
              onClick={() =>
                updateDay((p) => ({ ...p, submitted: false, answers: {} }))
              }
            >
              重新练习
            </button>
          </div>
        ) : (
          <>
            <button
              className="primary"
              disabled={!allAnswered}
              onClick={() =>
                update((p) => ({
                  ...p,
                  days: {
                    ...p.days,
                    [d.id]: { ...(p.days[d.id] ?? newDay()), submitted: true },
                  },
                  quizHistory: [
                    ...p.quizHistory,
                    {
                      id: makeId(),
                      lessonId: d.id,
                      at: new Date().toISOString(),
                      answers: { ...state.answers },
                    },
                  ],
                }))
              }
            >
              提交并查看解析
            </button>
            {!allAnswered && <p className="muted">请完成全部5道题后提交。</p>}
          </>
        )}
      </section>
      <section className="panel" id="translation">
        <h2>翻译练习 · 自评</h2>
        <p className="muted">
          草稿自动保存。每题6分，请结合要点自评，合理同义表达同样可以得分。
        </p>
        {d.translations.map((t, i) => (
          <article className="translation" key={t.id}>
            <label htmlFor={t.id}>
              <span className="badge">
                {t.direction === "en-zh" ? "英译汉" : "汉译英"} · {i + 1}
              </span>
              <p>{t.source}</p>
            </label>
            <textarea
              id={t.id}
              value={state.drafts[t.id] ?? ""}
              placeholder="在这里写下你的译文…"
              onChange={(e) =>
                updateDay((p) => ({
                  ...p,
                  drafts: { ...p.drafts, [t.id]: e.target.value },
                }))
              }
            />
            <button
              onClick={() =>
                setRevealed({ ...revealed, [t.id]: !revealed[t.id] })
              }
            >
              {revealed[t.id] ? "收起参考答案" : "查看参考答案与评分要点"}
            </button>
            {revealed[t.id] && (
              <div className="answer">
                <p>
                  <b>参考译文</b> {t.reference}
                </p>
                <p>术语 · {t.terms.join("；")}</p>
                <p>句法 · {t.grammar}</p>
                <p>常见错误 · {t.commonError}</p>
                <p>评分 · {t.rubric.join("；")}</p>
                <label>
                  自评分{" "}
                  <select
                    aria-label={`翻译${i + 1}自评分`}
                    value={state.selfScores[t.id] ?? ""}
                    onChange={(e) =>
                      updateDay((p) => ({
                        ...p,
                        selfScores: {
                          ...p.selfScores,
                          [t.id]: Number(e.target.value),
                        },
                      }))
                    }
                  >
                    <option value="" disabled>
                      未自评
                    </option>
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} / 6
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="row">
              <button
                disabled={!state.drafts[t.id]?.trim()}
                onClick={() =>
                  update((p) => ({
                    ...p,
                    translationHistory: [
                      ...p.translationHistory,
                      {
                        id: makeId(),
                        lessonId: d.id,
                        questionId: t.id,
                        at: new Date().toISOString(),
                        text: state.drafts[t.id],
                        score: state.selfScores[t.id],
                      },
                    ],
                  }))
                }
              >
                保存本次译文到历史
              </button>
              <button
                onClick={() => {
                  if (!window.confirm("将当前译文存入历史并开始重译？")) return;
                  update((p) => {
                    const saved = p.days[d.id] ?? newDay();
                    const scores = { ...saved.selfScores };
                    delete scores[t.id];
                    return {
                      ...p,
                      translationHistory: saved.drafts[t.id]?.trim()
                        ? [
                            ...p.translationHistory,
                            {
                              id: makeId(),
                              lessonId: d.id,
                              questionId: t.id,
                              at: new Date().toISOString(),
                              text: saved.drafts[t.id],
                              score: saved.selfScores[t.id],
                            },
                          ]
                        : p.translationHistory,
                      days: {
                        ...p.days,
                        [d.id]: {
                          ...saved,
                          drafts: { ...saved.drafts, [t.id]: "" },
                          selfScores: scores,
                        },
                      },
                    };
                  });
                  setRevealed({ ...revealed, [t.id]: false });
                }}
              >
                重新翻译
              </button>
            </div>
            <details>
              <summary>历史译文</summary>
              {progress.translationHistory
                .filter((a) => a.questionId === t.id)
                .map((a) => (
                  <div key={a.id}>
                    <p>
                      {new Date(a.at).toLocaleString()} ·{" "}
                      {a.score === undefined ? "未自评" : `${a.score}/6`}
                    </p>
                    <p>{a.text}</p>
                  </div>
                ))}
            </details>
          </article>
        ))}
      </section>
      <section className="panel" id="checklist">
        <h2>学习总结</h2>
        <p>{d.core.split("。").slice(0, 2).join("。")}。</p>
        <label htmlFor="daily-summary">今日收获与待复习问题</label>
        <textarea
          id="daily-summary"
          value={state.drafts["daily-summary"] ?? ""}
          onChange={(e) =>
            updateDay((p) => ({
              ...p,
              drafts: { ...p.drafts, "daily-summary": e.target.value },
            }))
          }
        />
        <h2>当日复习清单</h2>
        {d.checklist.map((x, i) => (
          <label className="option" key={x}>
            <input
              type="checkbox"
              checked={state.checklist[String(i)] ?? false}
              onChange={(e) =>
                updateDay((p) => ({
                  ...p,
                  checklist: { ...p.checklist, [String(i)]: e.target.checked },
                }))
              }
            />
            {x}
          </label>
        ))}
        <button
          className="primary"
          onClick={() => updateDay((p) => ({ ...p, completed: !p.completed }))}
        >
          {state.completed ? "已完成 ✓ · 点击撤销" : "标记本课已完成"}
        </button>
      </section>
    </>
  );
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
