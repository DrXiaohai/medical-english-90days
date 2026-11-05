import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/main";
import {
  lessons,
  program,
  newDay,
  grade,
  newProgress,
  validateProgress,
} from "../src/model";
import { readProgress, saveProgress } from "../src/storage";
beforeEach(async () => saveProgress(newProgress()));
describe("课程与评分", () => {
  it("90课完整且评分逐题准确", () => {
    expect(lessons.map((d) => d.day)).toEqual(
      Array.from({ length: 90 }, (_, i) => i + 1),
    );
    for (const d of lessons) {
      expect(grade(d, {})).toBe(0);
      expect(
        grade(d, Object.fromEntries(d.questions.map((q) => [q.id, q.answer]))),
      ).toBe(5);
      expect(
        grade(
          d,
          Object.fromEntries(
            d.questions.map((q) => [q.id, (q.answer + 1) % 4]),
          ),
        ),
      ).toBe(0);
    }
  });
  it("90天计划覆盖连续日期并核对教材总量", () => {
    expect(program.weeks.flatMap((w) => w.days)).toEqual(
      Array.from({ length: 90 }, (_, i) => i + 1),
    );
    expect(program.weeks.reduce((n, w) => n + w.estimatedPages, 0)).toBe(527);
  });
  it("旧心血管课程记录在新Day 22入口继续显示", async () => {
    const p = newProgress();
    p.days["day-08"] = {
      ...newDay(),
      completed: true,
      drafts: { "textbook-notes": "旧教材笔记" },
      answers: { "d8-q1": 1 },
    };
    await saveProgress(p);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 22 开始学习" }),
    );
    expect(
      (
        screen.getByRole("textbox", {
          name: "教材学习笔记",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("旧教材笔记");
    expect(
      screen.getByRole("button", { name: "已完成 ✓ · 点击撤销" }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("radio", {
          name: "B. A high blood pressure reading",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });
  it("拒绝未知版本和损坏数据", () => {
    expect(() => validateProgress({ version: 2 })).toThrow();
    expect(() =>
      validateProgress({ ...newProgress(), words: { test: "invalid" } }),
    ).toThrow();
    expect(() =>
      validateProgress({ ...newProgress(), days: { bad: {} } }),
    ).toThrow();
  });
  it("保留未知课程 ID 和词汇进度", async () => {
    const p = newProgress();
    p.words["future-word"] = "known";
    await saveProgress(p);
    expect((await readProgress()).words["future-word"]).toBe("known");
  });
});
describe("学习正常入口", () => {
  it("仪表盘开放全部90天", async () => {
    render(<App />);
    await screen.findByText("每天一点，读懂医学英语。");
    expect(
      screen
        .getByRole("button", { name: "Day 2 开始学习" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(
      screen.getAllByRole("button", { name: /Day \d+ (开始学习|待编写)/ }),
    ).toHaveLength(90);
  });
  it("翻转卡片、掌握状态、草稿与完成状态在重新载入后保留", async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 1 开始学习" }),
    );
    await user.click(screen.getByRole("button", { name: "翻转词汇卡" }));
    expect(
      screen.getByText("Cardiology is the study of the heart."),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "已掌握", exact: true }),
    );
    fireEvent.change(screen.getByLabelText(/These symptoms may indicate/), {
      target: { value: "这些症状可能提示胃部炎症。" },
    });
    await user.click(screen.getByRole("button", { name: "标记本课已完成" }));
    await waitFor(async () =>
      expect((await readProgress()).days["day-01"].completed).toBe(true),
    );
    view.unmount();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 1 开始学习" }),
    );
    expect(
      (
        screen.getByLabelText(
          /These symptoms may indicate/,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("这些症状可能提示胃部炎症。");
    expect(screen.getByText("1 / 15 · 已掌握")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "已完成 ✓ · 点击撤销" }),
    ).toBeTruthy();
  });
  it("教材任务显示且笔记重新载入后保留", async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 1 开始学习" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "The Language of Medicine · 教材学习",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Ch.1 · Basic Word Structure · 电子书导航起点 23/),
    ).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "教材学习笔记" }), {
      target: { value: "已读构词说明，记录3个例词；下次回查连接元音。" },
    });
    await waitFor(async () =>
      expect(
        (await readProgress()).days["day-01"].drafts["textbook-notes"],
      ).toContain("3个例词"),
    );
    view.unmount();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 1 开始学习" }),
    );
    expect(
      (
        screen.getByRole("textbox", {
          name: "教材学习笔记",
        }) as HTMLTextAreaElement
      ).value,
    ).toContain("3个例词");
  });
  it("提交前隐藏解析，完整作答后自动评分，重练清除提交状态", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 1 开始学习" }),
    );
    expect(
      screen
        .getByRole("button", { name: "提交并查看解析" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.queryByText(lessons[0].questions[0].explanation)).toBeNull();
    for (const q of lessons[0].questions)
      await user.click(
        screen.getByRole("radio", {
          name: `${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}`,
        }),
      );
    await user.click(screen.getByRole("button", { name: "提交并查看解析" }));
    expect(screen.getByText("本次得分 5 / 5")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "重新练习" }));
    expect(screen.queryByText("本次得分 5 / 5")).toBeNull();
  });
  it("翻译仅自评，默认隐藏答案且不自动判零", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Day 32 开始学习" }),
    );
    expect(
      screen.queryByText(
        lessons.find((d) => d.day === 32)!.translations[0].reference,
      ),
    ).toBeNull();
    await user.click(
      screen.getAllByRole("button", { name: "查看参考答案与评分要点" })[0],
    );
    expect(
      (
        screen.getByRole("combobox", {
          name: "翻译1自评分",
        }) as HTMLSelectElement
      ).value,
    ).toBe("");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "翻译1自评分" }),
      "5",
    );
    await waitFor(async () =>
      expect((await readProgress()).days["day-15"].selfScores["d15-t1"]).toBe(
        5,
      ),
    );
  });
});
