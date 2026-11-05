import React from "react";
import { beforeEach, describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/main";
import {
  newProgress,
  newDay,
  validateProgress,
  parseBackup,
  mergeProgress,
  scheduleWord,
  wrongQuestions,
  exams,
  examScores,
  lessons,
  type ExamAttempt,
} from "../src/model";
import { saveProgress, readProgress, readSnapshot } from "../src/storage";
beforeEach(async () => {
  await saveProgress(newProgress());
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());
const makeExam = (): ExamAttempt => ({
  id: "attempt-test",
  examId: exams[0].id,
  startedAt: new Date().toISOString(),
  durationSeconds: 3600,
  answers: {},
  drafts: {},
  selfScores: {},
});
describe("兼容与备份", () => {
  it("v1迁移保留草稿、词汇、旧ID并归档已提交选择题", () => {
    const legacy = {
      version: 1,
      theme: "dark",
      words: { old: "known" },
      days: {
        "day-08": {
          ...newDay(),
          submitted: true,
          answers: { "d8-q1": 1 },
          drafts: { "d8-t1": "旧译文" },
        },
      },
    };
    const p = validateProgress(legacy);
    expect(p.version).toBe(2);
    expect(p.days["day-08"].drafts["d8-t1"]).toBe("旧译文");
    expect(p.words.old).toBe("known");
    expect(p.quizHistory[0].id).toBe("legacy-day-08");
  });
  it("JSON导出后可完整导入且未知版本拒绝", () => {
    const p = newProgress();
    p.translationHistory.push({
      id: "t",
      lessonId: "future",
      questionId: "future-q",
      text: "future draft",
      at: new Date().toISOString(),
    });
    expect(parseBackup(JSON.stringify(p))).toEqual(p);
    expect(() => parseBackup('{"version":99}')).toThrow();
    expect(() => parseBackup("invalid")).toThrow();
  });
  it("导入合并保留本机冲突值和所有非冲突历史", () => {
    const a = newProgress(),
      b = newProgress();
    a.days.a = { ...newDay(), drafts: { q: "本机" } };
    b.days.a = {
      ...newDay(),
      completed: true,
      drafts: { q: "旧值", other: "补充" },
    };
    b.days.b = newDay();
    a.quizHistory = [
      { id: "same", lessonId: "a", at: "2026-01-01", answers: { q: 1 } },
    ];
    b.quizHistory = [
      { id: "same", lessonId: "a", at: "2026-01-01", answers: { q: 0 } },
      { id: "new", lessonId: "a", at: "2026-01-02", answers: { q: 2 } },
    ];
    const p = mergeProgress(a, b);
    expect(p.days.a.drafts).toEqual({ q: "本机", other: "补充" });
    expect(p.days.a.completed).toBe(true);
    expect(p.days.b).toBeTruthy();
    expect(p.quizHistory).toHaveLength(2);
    expect(p.quizHistory.find((x) => x.id === "same")?.answers.q).toBe(1);
  });
  it("损坏评分、未知调度日期与危险字典键被拒绝", () => {
    const p = newProgress();
    p.days.a = { ...newDay(), selfScores: { q: 9 } };
    expect(() => validateProgress(p)).toThrow();
    const bad = newProgress();
    bad.wordReview.x = {
      favorite: true,
      interval: 1,
      repetitions: 1,
      due: "invalid",
      lastReviewed: "invalid",
    };
    expect(() => validateProgress(bad)).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify(newProgress()).replace(
          '"words":{}',
          '"words":{"__proto__":"known"}',
        ),
      ),
    ).toThrow();
  });
  it("旧修订号写入被拒绝且已保存数据不被覆盖", async () => {
    const a = await readSnapshot();
    const next = { ...a.progress, theme: "dark" as const };
    await saveProgress(next, a.revision);
    await expect(saveProgress(newProgress(), a.revision)).rejects.toThrow(
      "其他标签页",
    );
    expect((await readProgress()).theme).toBe("dark");
  });
});
describe("评分与间隔复习", () => {
  it("记住为1天再2天，忘记为10分钟且保留收藏", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const first = scheduleWord(undefined, true, now);
    expect(first.due).toBe("2026-01-02T00:00:00.000Z");
    const second = scheduleWord({ ...first, favorite: true }, true, now);
    expect(second.interval).toBe(2);
    const forgotten = scheduleWord(second, false, now);
    expect(forgotten.due).toBe("2026-01-01T00:10:00.000Z");
    expect(forgotten.favorite).toBe(true);
  });
  it("四套模考满分均100，未自评不能显示最终总分", () => {
    for (const e of exams) {
      const a = {
        ...makeExam(),
        examId: e.id,
        answers: Object.fromEntries(e.questions.map((q) => [q.id, q.answer])),
      };
      expect(examScores(e, a)).toMatchObject({
        objective: 40,
        total: 40,
        reviewed: false,
      });
      a.selfScores = Object.fromEntries(e.translations.map((t) => [t.id, 6]));
      expect(examScores(e, a)).toMatchObject({ total: 100, reviewed: true });
    }
  });
  it("错题收录日课历史与模考漏答，重答不抹除原记录", () => {
    const p = newProgress();
    p.quizHistory = [
      {
        id: "q1",
        lessonId: lessons[0].id,
        at: new Date().toISOString(),
        answers: {},
      },
    ];
    const a = makeExam();
    a.submittedAt = new Date().toISOString();
    p.examAttempts = [a];
    expect(wrongQuestions(p)).toHaveLength(25);
    expect(
      wrongQuestions(p).find((x) => x.question.id === "exam-1-q12")?.passage,
    ).toContain("cough for six days");
    p.wrongReview[lessons[0].questions[0].id] = {
      mastered: true,
      attempts: [],
    };
    expect(wrongQuestions(p)).toHaveLength(25);
  });
});
describe("新功能正常入口", () => {
  it("收藏、按章筛选和随机词汇测试可保存", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("每天一点，读懂医学英语。");
    await user.click(
      screen.getByRole("button", { name: "词汇复习", exact: true }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "搜索词汇" }), {
      target: { value: "cardi/o" },
    });
    await user.click(
      screen.getByRole("button", { name: "收藏生词", exact: true }),
    );
    await user.selectOptions(screen.getByLabelText("筛选"), "favorites");
    await user.click(screen.getByRole("button", { name: "随机测试" }));
    await user.click(screen.getByRole("button", { name: "心", exact: true }));
    await waitFor(async () =>
      expect((await readProgress()).wordReview["cardi-o"].favorite).toBe(true),
    );
    expect((await readProgress()).words["cardi-o"]).toBe("known");
  });
  it("翻译重答归档原答案，完整重学保留教材笔记", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 1 开始学习" }),
    );
    fireEvent.change(screen.getByLabelText(/These symptoms may indicate/), {
      target: { value: "原译文" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "教材学习笔记" }), {
      target: { value: "教材笔记" },
    });
    await user.click(screen.getAllByRole("button", { name: "重新翻译" })[0]);
    await waitFor(async () =>
      expect((await readProgress()).translationHistory[0].text).toBe("原译文"),
    );
    expect(
      (
        screen.getByLabelText(
          /These symptoms may indicate/,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    fireEvent.change(
      screen.getByRole("textbox", { name: "今日收获与待复习问题" }),
      { target: { value: "保留总结" } },
    );
    await user.click(screen.getByRole("button", { name: "重新学习本课" }));
    await waitFor(async () =>
      expect(
        (await readProgress()).days["day-01"].drafts["daily-summary"],
      ).toBe("保留总结"),
    );
    await waitFor(async () =>
      expect(
        (await readProgress()).days["day-01"].drafts["textbook-notes"],
      ).toBe("教材笔记"),
    );
  });
  it("错题可重答并标记掌握，历史保留", async () => {
    const p = newProgress();
    const d = lessons[0];
    p.quizHistory = [
      {
        id: "old",
        lessonId: d.id,
        at: new Date().toISOString(),
        answers: Object.fromEntries(d.questions.map((q) => [q.id, q.answer])),
      },
    ];
    p.quizHistory[0].answers[d.questions[0].id] =
      (d.questions[0].answer + 1) % 4;
    await saveProgress(p);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("每天一点，读懂医学英语。");
    await user.click(
      screen.getByRole("button", { name: "错题本", exact: true }),
    );
    await user.click(
      screen.getByRole("radio", {
        name: d.questions[0].options[d.questions[0].answer],
      }),
    );
    await user.click(screen.getByRole("button", { name: "提交重答" }));
    expect(screen.getByText("上次重答正确")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "标记已掌握" }));
    await waitFor(async () =>
      expect(
        (await readProgress()).wrongReview[d.questions[0].id].mastered,
      ).toBe(true),
    );
  });
  it("模考提交锁定答案、保存成绩并进入历史", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("每天一点，读懂医学英语。");
    await user.click(
      screen.getByRole("button", { name: "模拟考试", exact: true }),
    );
    await user.click(
      screen.getAllByRole("button", { name: "开始新一次考试" })[0],
    );
    const q = exams[0].questions[0];
    await user.click(screen.getByRole("radio", { name: q.options[q.answer] }));
    await user.click(screen.getByRole("button", { name: "提交考试" }));
    expect(
      screen
        .getByRole("radio", { name: q.options[q.answer] })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByText("已提交 · 客观2/40 · 翻译待自评")).toBeTruthy();
    await waitFor(async () =>
      expect((await readProgress()).examAttempts[0].submittedAt).toBeTruthy(),
    );
    expect(
      examScores(exams[0], (await readProgress()).examAttempts[0]).objective,
    ).toBe(2);
  });
  it("已超时考试重新打开后自动提交，草稿保留", async () => {
    const p = newProgress();
    p.examAttempts = [
      {
        ...makeExam(),
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        drafts: { [exams[0].translations[0].id]: "未丢失" },
      },
    ];
    await saveProgress(p);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("每天一点，读懂医学英语。");
    await user.click(
      screen.getByRole("button", { name: "模拟考试", exact: true }),
    );
    await user.click(screen.getByRole("button", { name: "继续考试" }));
    await waitFor(async () =>
      expect((await readProgress()).examAttempts[0].submittedAt).toBeTruthy(),
    );
    expect(
      (await readProgress()).examAttempts[0].drafts[
        exams[0].translations[0].id
      ],
    ).toBe("未丢失");
  });
});
