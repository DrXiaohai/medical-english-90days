import React, { useEffect, useMemo, useState } from "react";
import {
  lessons,
  exams,
  vocabulary,
  wrongQuestions,
  scheduleWord,
  makeId,
  examScores,
  lessonSystem,
  type Progress,
  type ExamAttempt,
} from "./model";
type Props = {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
};
const today = () => new Date().toISOString();
export function VocabularyReview({ progress, update }: Props) {
  const [page, setPage] = useState(0);
  const [chapter, setChapter] = useState("");
  const [only, setOnly] = useState("all");
  const [search, setSearch] = useState("");
  const [test, setTest] = useState<{ id: string; options: string[] } | null>(
    null,
  );
  const [answer, setAnswer] = useState<string | null>(null);
  useEffect(() => setPage(0), [chapter, only, search]);
  const chapterList = [...new Set(lessons.map((d) => d.chapter))];
  const filtered = vocabulary.filter(
    (v) =>
      (!chapter ||
        lessons.some(
          (d) =>
            d.chapter === chapter && d.vocabulary.some((w) => w.id === v.id),
        )) &&
      (!search ||
        (v.english + " " + v.chinese)
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (only !== "favorites" || progress.wordReview[v.id]?.favorite) &&
      (only !== "due" ||
        !progress.wordReview[v.id] ||
        Date.parse(progress.wordReview[v.id].due) <= Date.now()),
  );
  function toggle(id: string) {
    update((p) => {
      const r = p.wordReview[id] ?? {
        favorite: false,
        interval: 0,
        due: today(),
        lastReviewed: today(),
        repetitions: 0,
      };
      return {
        ...p,
        wordReview: { ...p.wordReview, [id]: { ...r, favorite: !r.favorite } },
      };
    });
  }
  function review(id: string, remembered: boolean) {
    update((p) => ({
      ...p,
      words: { ...p.words, [id]: remembered ? "known" : "learning" },
      wordReview: {
        ...p.wordReview,
        [id]: scheduleWord(p.wordReview[id], remembered),
      },
    }));
  }
  function randomTest() {
    if (!filtered.length) return;
    const v = filtered[Math.floor(Math.random() * filtered.length)];
    const options = [
      ...new Set(
        vocabulary.filter((w) => w.chinese !== v.chinese).map((w) => w.chinese),
      ),
    ]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    options.push(v.chinese);
    setTest({ id: v.id, options: options.sort(() => Math.random() - 0.5) });
    setAnswer(null);
  }
  const current = vocabulary.find((v) => v.id === test?.id);
  return (
    <>
      <p className="eyebrow">VOCABULARY REVIEW</p>
      <h1>词汇复习</h1>
      <section className="panel">
        <div className="row">
          <label>
            教材范围{" "}
            <select
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            >
              <option value="">全部章节</option>
              {chapterList.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            筛选{" "}
            <select value={only} onChange={(e) => setOnly(e.target.value)}>
              <option value="all">全部词汇</option>
              <option value="favorites">收藏生词</option>
              <option value="due">到期及未复习</option>
            </select>
          </label>
          <input
            aria-label="搜索词汇"
            placeholder="搜索英文或中文"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={randomTest} disabled={!filtered.length}>
            随机测试
          </button>
        </div>
        <p>
          {filtered.length}
          个词汇。记住后间隔从1天起逐次翻倍，上限180天；忘记则10分钟后再练。
        </p>
        {test && current && (
          <fieldset>
            <legend>{current.english} 的中文含义是什么？</legend>
            {test.options.map((o) => (
              <button
                key={o}
                disabled={answer !== null}
                onClick={() => {
                  setAnswer(o);
                  review(current.id, o === current.chinese);
                }}
              >
                {o}
              </button>
            ))}
            {answer !== null && (
              <div className="answer">
                {answer === current.chinese ? "正确" : "需要复习"} ·{" "}
                {current.chinese}
                <p>{current.example}</p>
                <p>{current.translation}</p>
                <button onClick={randomTest}>再测一词</button>
              </div>
            )}
          </fieldset>
        )}
      </section>
      <section className="panel">
        {filtered.slice(page * 40, (page + 1) * 40).map((v) => (
          <article className="translation" key={v.id}>
            <h3>
              {v.english} <small>{v.chinese}</small>
            </h3>
            <p>
              {v.pos} · {v.morphology}
            </p>
            <p>
              {v.example}
              <br />
              {v.translation}
            </p>
            <div className="row">
              <button
                aria-pressed={progress.wordReview[v.id]?.favorite ?? false}
                onClick={() => toggle(v.id)}
              >
                {progress.wordReview[v.id]?.favorite ? "取消收藏" : "收藏生词"}
              </button>
              <button onClick={() => review(v.id, false)}>忘记了</button>
              <button onClick={() => review(v.id, true)}>记住了</button>
            </div>
            <small>
              {progress.wordReview[v.id]
                ? `下次复习 ${new Date(progress.wordReview[v.id].due).toLocaleString()}`
                : "尚未安排复习"}
            </small>
          </article>
        ))}
        <div className="row">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span>
            第{page + 1}/{Math.max(1, Math.ceil(filtered.length / 40))}页
          </span>
          <button
            disabled={(page + 1) * 40 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </button>
        </div>
      </section>
    </>
  );
}
export function WrongBook({ progress, update }: Props) {
  const [showMastered, setShowMastered] = useState(false);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const wrong = wrongQuestions(progress);
  return (
    <>
      <p className="eyebrow">LEARN FROM MISTAKES</p>
      <h1>错题本</h1>
      <label className="option">
        <input
          type="checkbox"
          checked={showMastered}
          onChange={(e) => setShowMastered(e.target.checked)}
        />
        显示已掌握题目
      </label>
      <p>累计收录{wrong.length}题。答对后可自行标记已掌握，历史记录保留。</p>
      {wrong
        .filter(
          ({ question: q }) =>
            showMastered || !progress.wrongReview[q.id]?.mastered,
        )
        .map(({ question: q, lesson: d, passage }) => {
          const history = progress.wrongReview[q.id]?.attempts ?? [];
          return (
            <section className="panel" key={q.id}>
              <p className="eyebrow">
                {d.day === null ? "模考" : `Day ${d.day}`} · {d.title}
              </p>
              {passage && (
                <details>
                  <summary>原阅读 / 病例</summary>
                  <p className="english prose">{passage}</p>
                </details>
              )}
              <h3>{q.stem}</h3>
              {q.options.map((o, j) => (
                <label className="option" key={o}>
                  <input
                    type="radio"
                    name={"wrong-" + q.id}
                    checked={selection[q.id] === j}
                    onChange={() => setSelection({ ...selection, [q.id]: j })}
                  />
                  {o}
                </label>
              ))}
              <button
                disabled={selection[q.id] === undefined}
                onClick={() => {
                  const selected = selection[q.id];
                  update((p) => ({
                    ...p,
                    wrongReview: {
                      ...p.wrongReview,
                      [q.id]: {
                        mastered: false,
                        attempts: [
                          ...(p.wrongReview[q.id]?.attempts ?? []),
                          { id: makeId(), at: today(), answer: selected },
                        ],
                      },
                    },
                  }));
                }}
              >
                提交重答
              </button>
              <details>
                <summary>查看正确答案与解析</summary>
                <p>{q.options[q.answer]}</p>
                <p>{q.explanation}</p>
              </details>
              {history.length > 0 && (
                <p role="status">
                  上次重答
                  {history.at(-1)?.answer === q.answer ? "正确" : "错误"}
                </p>
              )}
              <button
                onClick={() =>
                  update((p) => ({
                    ...p,
                    wrongReview: {
                      ...p.wrongReview,
                      [q.id]: {
                        attempts: history,
                        mastered: !p.wrongReview[q.id]?.mastered,
                      },
                    },
                  }))
                }
              >
                {progress.wrongReview[q.id]?.mastered
                  ? "重新列入复习"
                  : "标记已掌握"}
              </button>
              <details>
                <summary>历次作答记录</summary>
                {progress.quizHistory
                  .filter(
                    (a) => a.lessonId === d.id && a.answers[q.id] !== undefined,
                  )
                  .map((a) => (
                    <p key={a.id}>
                      {new Date(a.at).toLocaleString()} · 日课 ·{" "}
                      {q.options[a.answers[q.id]]} ·{" "}
                      {a.answers[q.id] === q.answer ? "正确" : "错误"}
                    </p>
                  ))}
                {progress.examAttempts
                  .filter((a) => a.examId === d.id && a.submittedAt)
                  .map((a) => (
                    <p key={a.id}>
                      {new Date(a.startedAt).toLocaleString()} · 模考 ·{" "}
                      {a.answers[q.id] === undefined
                        ? "未答"
                        : q.options[a.answers[q.id]]}{" "}
                      · {a.answers[q.id] === q.answer ? "正确" : "错误"}
                    </p>
                  ))}
                {history.map((a) => (
                  <p key={a.id}>
                    {new Date(a.at).toLocaleString()} · 重答 ·{" "}
                    {q.options[a.answer]} ·{" "}
                    {a.answer === q.answer ? "正确" : "错误"}
                  </p>
                ))}
              </details>
            </section>
          );
        })}
    </>
  );
}
export function ExamCenter({ progress, update }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const attempt = progress.examAttempts.find((a) => a.id === selected);
  const exam = exams.find((e) => e.id === attempt?.examId);
  const seconds = attempt
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(attempt.startedAt) +
            attempt.durationSeconds * 1000 -
            now) /
            1000,
        ),
      )
    : 0;
  function patch(fn: (a: ExamAttempt) => ExamAttempt) {
    if (!selected) return;
    update((p) => ({
      ...p,
      examAttempts: p.examAttempts.map((a) => {
        if (a.id !== selected) return a;
        const deadline = Date.parse(a.startedAt) + a.durationSeconds * 1000;
        if (!a.submittedAt && Date.now() >= deadline)
          return { ...a, submittedAt: new Date(deadline).toISOString() };
        return fn(a);
      }),
    }));
  }
  useEffect(() => {
    if (attempt && !attempt.submittedAt && seconds === 0)
      patch((a) => ({ ...a, submittedAt: today() }));
  }, [attempt?.id, attempt?.submittedAt, seconds]);
  if (!attempt || !exam)
    return (
      <>
        <p className="eyebrow">MOCK EXAMINATIONS</p>
        <h1>综合模拟考试</h1>
        <p>
          客观题40分，翻译自评60分。提交前隐藏解析，计时包含页面关闭期间。超时提交已保存答案，未答客观题计0分，翻译保持未自评。
        </p>
        {exams.map((e) => {
          const running = progress.examAttempts.find(
            (a) => a.examId === e.id && !a.submittedAt,
          );
          return (
            <section className="panel" key={e.id}>
              <h2>{e.title}</h2>
              <p>
                {e.minutes}分钟 · {e.questions.length}道客观题 ·{" "}
                {e.translations.length}道翻译
              </p>
              <button
                className="primary"
                onClick={() => {
                  if (running) {
                    setSelected(running.id);
                    return;
                  }
                  const a: ExamAttempt = {
                    id: makeId(),
                    examId: e.id,
                    startedAt: today(),
                    durationSeconds: e.minutes * 60,
                    answers: {},
                    drafts: {},
                    selfScores: {},
                  };
                  update((p) => ({
                    ...p,
                    examAttempts: [...p.examAttempts, a],
                  }));
                  setNow(Date.now());
                  setSelected(a.id);
                }}
              >
                {running ? "继续考试" : "开始新一次考试"}
              </button>
              {progress.examAttempts
                .filter((a) => a.examId === e.id && a.submittedAt)
                .map((a) => {
                  const scores = examScores(e, a);
                  return (
                    <p key={a.id}>
                      <button onClick={() => setSelected(a.id)}>
                        {new Date(a.startedAt).toLocaleString()} · 客观
                        {scores.objective}/40 ·{" "}
                        {scores.reviewed
                          ? `总分${scores.total}/100`
                          : "翻译待自评"}
                      </button>
                    </p>
                  );
                })}
            </section>
          );
        })}
      </>
    );
  const submitted = !!attempt.submittedAt;
  const scores = examScores(exam, attempt);
  return (
    <>
      <button onClick={() => setSelected(null)}>← 返回考试列表</button>
      <h1>{exam.title}</h1>
      <p role="status">
        {submitted
          ? `已提交 · 客观${scores.objective}/40 · ${scores.reviewed ? `总分${scores.total}/100` : "翻译待自评"}`
          : `剩余 ${Math.floor(seconds / 60)}分${seconds % 60}秒 · 答案自动保存`}
      </p>
      <section className="panel">
        <h2>客观题</h2>
        {exam.questions.map((q, i) => (
          <fieldset key={q.id}>
            <legend>
              {i + 1}. {q.stem}
            </legend>
            {q.options.map((o, j) => (
              <label className="option" key={o}>
                <input
                  type="radio"
                  disabled={submitted}
                  name={q.id}
                  checked={attempt.answers[q.id] === j}
                  onChange={() =>
                    patch((a) => ({
                      ...a,
                      answers: { ...a.answers, [q.id]: j },
                    }))
                  }
                />
                {o}
              </label>
            ))}
            {submitted && (
              <div className="answer">
                答案 {q.options[q.answer]}
                <p>{q.explanation}</p>
              </div>
            )}
          </fieldset>
        ))}
      </section>
      <section className="panel">
        <h2>翻译题 · 每题6分</h2>
        {exam.translations.map((t, i) => (
          <article className="translation" key={t.id}>
            <label htmlFor={t.id}>
              {i + 1}. {t.source}
            </label>
            <textarea
              id={t.id}
              disabled={submitted}
              value={attempt.drafts[t.id] ?? ""}
              onChange={(e) =>
                patch((a) => ({
                  ...a,
                  drafts: { ...a.drafts, [t.id]: e.target.value },
                }))
              }
            />
            {submitted && (
              <div className="answer">
                <p>{t.reference}</p>
                <p>{t.terms.join("；")}</p>
                <p>{t.grammar}</p>
                <p>常见错误 · {t.commonError}</p>
                <p>{t.rubric.join("；")}</p>
                <label>
                  自评{" "}
                  <select
                    value={attempt.selfScores[t.id] ?? ""}
                    onChange={(e) =>
                      patch((a) => ({
                        ...a,
                        selfScores: {
                          ...a.selfScores,
                          [t.id]: Number(e.target.value),
                        },
                      }))
                    }
                  >
                    <option value="" disabled>
                      未自评
                    </option>
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </article>
        ))}
      </section>
      {!submitted && (
        <button
          className="primary"
          onClick={() => {
            if (window.confirm("确认提交本次考试？提交后客观题和译文将锁定。"))
              patch((a) => ({ ...a, submittedAt: today() }));
          }}
        >
          提交考试
        </button>
      )}
    </>
  );
}
export function LearningStats({ progress }: Props) {
  const systems = useMemo(() => [...new Set(lessons.map(lessonSystem))], []);
  return (
    <section className="panel">
      <h2>各系统练习正确率</h2>
      {systems.map((system) => {
        const ds = lessons.filter(
          (d) => lessonSystem(d) === system && progress.days[d.id]?.submitted,
        );
        const total = ds.reduce((n, d) => n + d.questions.length, 0);
        const correct = ds.reduce(
          (n, d) =>
            n +
            d.questions.filter(
              (q) => progress.days[d.id].answers[q.id] === q.answer,
            ).length,
          0,
        );
        return (
          <p key={system}>
            {system} ·{" "}
            {total
              ? `${Math.round((correct / total) * 100)}% (${correct}/${total})`
              : "尚无提交"}
          </p>
        );
      })}
      <h2>模拟考试成绩变化</h2>
      {progress.examAttempts.filter((a) => a.submittedAt).length === 0 ? (
        <p>完成模拟考试后显示历次客观分与自评总分。</p>
      ) : (
        <ol>
          {progress.examAttempts
            .filter((a) => a.submittedAt)
            .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
            .map((a) => {
              const e = exams.find((e) => e.id === a.examId);
              if (!e) return null;
              const s = examScores(e, a);
              return (
                <li key={a.id}>
                  {new Date(a.startedAt).toLocaleDateString()} · {e.title} ·
                  客观{s.objective}/40 ·{" "}
                  {s.reviewed ? `总分${s.total}/100` : "翻译待自评"}
                </li>
              );
            })}
        </ol>
      )}
    </section>
  );
}
