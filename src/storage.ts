import { openDB } from "idb";
import { newProgress, validateProgress, type Progress } from "./model";
const database = () =>
  openDB("internal-medicine-english", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export async function readSnapshot() {
  const db = await database();
  try {
    const tx = db.transaction("state", "readonly");
    const [stored, revision] = await Promise.all([
      tx.store.get("progress"),
      tx.store.get("revision"),
    ]);
    await tx.done;
    return {
      progress: stored === undefined ? newProgress() : validateProgress(stored),
      revision: Number(revision ?? 0),
    };
  } finally {
    db.close();
  }
}
export async function readProgress() {
  return (await readSnapshot()).progress;
}
export async function saveProgress(
  progress: Progress,
  expectedRevision?: number,
) {
  const db = await database();
  try {
    const tx = db.transaction("state", "readwrite");
    const revision = Number((await tx.store.get("revision")) ?? 0);
    if (expectedRevision !== undefined && revision !== expectedRevision) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error(
        "其他标签页已更新记录。请导出当前进度后刷新，再导入合并。",
      );
    }
    await tx.store.put(progress, "progress");
    await tx.store.put(revision + 1, "revision");
    await tx.done;
    return revision + 1;
  } finally {
    db.close();
  }
}
