import lessonsData from "./generated/lessons.json";
import examsData from "./generated/exams.json";
export const lessons = lessonsData;
export const exams: Exam[] = examsData;
export type Lesson = (typeof lessons)[number];
export interface Exam {
  id: string;
  title: string;
  minutes: number;
  pointsPerQuestion: number;
  questions: Lesson["questions"];
  translations: Lesson["translations"];
}
export { default as program } from "./generated/program.json";
export interface DayProgress {
  completed: boolean;
  answers: Record<string, number>;
  submitted: boolean;
  drafts: Record<string, string>;
  selfScores: Record<string, number>;
  checklist: Record<string, boolean>;
}
export interface QuizAttempt {
  id: string;
  lessonId: string;
  at: string;
  answers: Record<string, number>;
}
export interface TranslationAttempt {
  id: string;
  lessonId: string;
  questionId: string;
  at: string;
  text: string;
  score?: number;
}
export interface WordReview {
  favorite: boolean;
  interval: number;
  due: string;
  lastReviewed: string;
  repetitions: number;
}
export interface WrongReview {
  mastered: boolean;
  attempts: { id: string; at: string; answer: number }[];
}
export interface ExamAttempt {
  id: string;
  examId: string;
  startedAt: string;
  durationSeconds: number;
  submittedAt?: string;
  answers: Record<string, number>;
  drafts: Record<string, string>;
  selfScores: Record<string, number>;
}
export interface Progress {
  version: 2;
  days: Record<string, DayProgress>;
  words: Record<string, "learning" | "known">;
  theme: "light" | "dark";
  wordReview: Record<string, WordReview>;
  quizHistory: QuizAttempt[];
  translationHistory: TranslationAttempt[];
  wrongReview: Record<string, WrongReview>;
  examAttempts: ExamAttempt[];
}
export const newDay = (): DayProgress => ({
  completed: false,
  answers: {},
  submitted: false,
  drafts: {},
  selfScores: {},
  checklist: {},
});
export const newProgress = (): Progress => ({
  version: 2,
  days: {},
  words: {},
  theme: "light",
  wordReview: {},
  quizHistory: [],
  translationHistory: [],
  wrongReview: {},
  examAttempts: [],
});
export const makeId = () => crypto.randomUUID();
export function grade(
  lesson: Pick<Lesson, "questions">,
  answers: Record<string, number>,
) {
  return lesson.questions.filter((q) => answers[q.id] === q.answer).length;
}
export const vocabulary = Array.from(
  new Map(lessons.flatMap((d) => d.vocabulary).map((v) => [v.id, v])).values(),
);
export function lessonSystem(d: Lesson) {
  const chapter = Number(d.chapter.match(/Ch\.(\d+)/)?.[1]);
  const names: Record<number, string> = {
    1: "构词基础",
    2: "身体与病史",
    3: "后缀",
    4: "前缀",
    5: "消化",
    6: "消化",
    7: "泌尿",
    10: "神经",
    11: "心血管",
    12: "呼吸",
    13: "血液",
    14: "免疫",
    18: "内分泌",
    19: "肿瘤",
    20: "影像",
    21: "药理",
  };
  return names[chapter] ?? "综合";
}
function examPassage(exam: Exam, stem: string) {
  const label = stem.match(/^(?:In )?Case ([A-H])[.,]/)?.[1];
  return label
    ? exam.questions
        .find((q) => q.stem.startsWith(`Case ${label}.`))
        ?.stem.split("\n\n")[0]
    : undefined;
}

export const questionMap = new Map<
  string,
  {
    question: Lesson["questions"][number];
    lesson: { id: string; day: number | null; title: string };
    passage?: string;
  }
>([
  ...lessons.flatMap((d) =>
    d.questions.map(
      (q) => [q.id, { question: q, lesson: d, passage: d.reading }] as const,
    ),
  ),
  ...exams.flatMap((e) =>
    e.questions.map(
      (q) =>
        [
          q.id,
          {
            question: q,
            lesson: { id: e.id, day: null, title: e.title },
            passage: examPassage(e, q.stem),
          },
        ] as const,
    ),
  ),
]);
export function wrongQuestions(p: Progress) {
  const ids = new Set<string>();
  for (const a of p.quizHistory) {
    const d = lessons.find((d) => d.id === a.lessonId);
    d?.questions.forEach((q) => {
      if (a.answers[q.id] !== q.answer) ids.add(q.id);
    });
  }
  // 接续旧版已提交日课，并收录模考中的错误和漏答。
  for (const d of lessons) {
    const saved = p.days[d.id];
    if (saved?.submitted)
      d.questions.forEach((q) => {
        if (saved.answers[q.id] !== q.answer) ids.add(q.id);
      });
  }
  for (const a of p.examAttempts) {
    if (a.submittedAt)
      exams
        .find((e) => e.id === a.examId)
        ?.questions.forEach((q) => {
          if (a.answers[q.id] !== q.answer) ids.add(q.id);
        });
  }
  return [...ids]
    .map((id) => questionMap.get(id))
    .filter((x): x is NonNullable<typeof x> => !!x);
}
export function scheduleWord(
  previous: WordReview | undefined,
  remembered: boolean,
  now = new Date(),
): WordReview {
  const interval = remembered
    ? previous?.repetitions
      ? Math.min(180, Math.max(1, previous.interval) * 2)
      : 1
    : 0;
  const due = new Date(
    now.getTime() + (remembered ? interval * 86400000 : 600000),
  );
  return {
    favorite: previous?.favorite ?? false,
    interval,
    due: due.toISOString(),
    lastReviewed: now.toISOString(),
    repetitions: remembered ? (previous?.repetitions ?? 0) + 1 : 0,
  };
}
export function examScores(exam: Exam, attempt: ExamAttempt) {
  const objective = grade(exam, attempt.answers) * exam.pointsPerQuestion;
  const self = exam.translations.reduce(
    (n, t) => n + (attempt.selfScores[t.id] ?? 0),
    0,
  );
  return {
    objective,
    self,
    total: objective + self,
    reviewed: exam.translations.every(
      (t) => attempt.selfScores[t.id] !== undefined,
    ),
  };
}
function record(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function requireValid(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function dictionary(x: unknown, test: (v: unknown) => boolean) {
  return (
    record(x) &&
    Object.entries(x).every(
      ([k, v]) =>
        !["__proto__", "constructor", "prototype"].includes(k) && test(v),
    )
  );
}
const text = (x: unknown): x is string =>
  typeof x === "string" && x.length <= 100000;
const boolean = (x: unknown) => typeof x === "boolean";
const choice = (x: unknown) =>
  Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 3;
const score = (x: unknown) =>
  Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 6;
const date = (x: unknown) =>
  typeof x === "string" && Number.isFinite(Date.parse(x));
const identity = (x: Record<string, unknown>) => text(x.id) && !!x.id;
function arrayOf(
  value: unknown,
  test: (x: Record<string, unknown>) => boolean,
) {
  return (
    Array.isArray(value) &&
    value.length <= 100000 &&
    value.every((x) => record(x) && test(x)) &&
    new Set(value.map((x) => x.id)).size === value.length
  );
}
// v1原样承接，升级只补充字段，保留未知课程的既有记录。
export function validateProgress(value: unknown): Progress {
  requireValid(record(value), "学习数据必须是对象");
  const v = value;
  requireValid(v.version === 1 || v.version === 2, "不支持的学习数据版本");
  requireValid(v.theme === "light" || v.theme === "dark", "主题字段无效");
  requireValid(
    dictionary(v.words, (x) => x === "learning" || x === "known"),
    "词汇状态无效",
  );
  requireValid(
    dictionary(
      v.days,
      (x) =>
        record(x) &&
        boolean(x.completed) &&
        boolean(x.submitted) &&
        dictionary(x.answers, choice) &&
        dictionary(x.drafts, text) &&
        dictionary(x.selfScores, score) &&
        dictionary(x.checklist, boolean),
    ),
    "课程记录无效",
  );
  if (v.version === 1) {
    const days = v.days as Record<string, DayProgress>;
    const quizHistory = Object.entries(days)
      .filter(([, d]) => d.submitted)
      .map(([id, d]) => ({
        id: `legacy-${id}`,
        lessonId: id,
        at: new Date().toISOString(),
        answers: { ...d.answers },
      }));
    return {
      ...newProgress(),
      days,
      words: v.words as Progress["words"],
      theme: v.theme,
      quizHistory,
    };
  }
  requireValid(
    dictionary(
      v.wordReview,
      (x) =>
        record(x) &&
        boolean(x.favorite) &&
        Number.isInteger(x.interval) &&
        Number(x.interval) >= 0 &&
        Number(x.interval) <= 180 &&
        Number.isInteger(x.repetitions) &&
        Number(x.repetitions) >= 0 &&
        date(x.due) &&
        date(x.lastReviewed),
    ),
    "间隔复习数据无效",
  );
  requireValid(
    arrayOf(
      v.quizHistory,
      (x) =>
        identity(x) &&
        text(x.lessonId) &&
        date(x.at) &&
        dictionary(x.answers, choice),
    ),
    "选择题历史无效",
  );
  requireValid(
    arrayOf(
      v.translationHistory,
      (x) =>
        identity(x) &&
        text(x.lessonId) &&
        text(x.questionId) &&
        date(x.at) &&
        text(x.text) &&
        (x.score === undefined || score(x.score)),
    ),
    "翻译历史无效",
  );
  requireValid(
    dictionary(
      v.wrongReview,
      (x) =>
        record(x) &&
        boolean(x.mastered) &&
        arrayOf(
          x.attempts,
          (a) => identity(a) && date(a.at) && choice(a.answer),
        ),
    ),
    "错题记录无效",
  );
  requireValid(
    arrayOf(
      v.examAttempts,
      (x) =>
        identity(x) &&
        text(x.examId) &&
        date(x.startedAt) &&
        (x.submittedAt === undefined || date(x.submittedAt)) &&
        Number.isInteger(x.durationSeconds) &&
        Number(x.durationSeconds) > 0 &&
        Number(x.durationSeconds) <= 14400 &&
        dictionary(x.answers, choice) &&
        dictionary(x.drafts, text) &&
        dictionary(x.selfScores, score),
    ),
    "模拟考试记录无效",
  );
  return v as unknown as Progress;
}
export function parseBackup(input: string) {
  requireValid(input.length <= 20000000, "备份超过20MB限制");
  const raw = JSON.parse(input);
  return validateProgress(raw.progress ?? raw);
}
// 同ID冲突保留当前设备值；历史按ID合并，避免恢复备份删除较新作答。
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const union = <T extends { id: string }>(a: T[], b: T[]) => [
    ...new Map([...b, ...a].map((x) => [x.id, x])).values(),
  ];
  const days = { ...incoming.days };
  for (const [id, d] of Object.entries(current.days)) {
    const old = days[id];
    days[id] = old
      ? {
          ...old,
          ...d,
          answers: { ...old.answers, ...d.answers },
          drafts: { ...old.drafts, ...d.drafts },
          selfScores: { ...old.selfScores, ...d.selfScores },
          checklist: { ...old.checklist, ...d.checklist },
          completed: old.completed || d.completed,
        }
      : d;
  }
  const wrongReview = { ...incoming.wrongReview };
  for (const [id, r] of Object.entries(current.wrongReview)) {
    wrongReview[id] = {
      ...r,
      attempts: union(r.attempts, wrongReview[id]?.attempts ?? []),
    };
  }
  return {
    ...current,
    days,
    words: { ...incoming.words, ...current.words },
    wordReview: { ...incoming.wordReview, ...current.wordReview },
    wrongReview,
    quizHistory: union(current.quizHistory, incoming.quizHistory),
    translationHistory: union(
      current.translationHistory,
      incoming.translationHistory,
    ),
    examAttempts: union(current.examAttempts, incoming.examAttempts),
  };
}
