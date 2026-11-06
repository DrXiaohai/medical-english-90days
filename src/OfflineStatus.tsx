import { useEffect, useRef, useState } from "react";

type CacheReply = {
  ready: boolean;
  version?: string;
  files?: number;
  total?: number;
  error?: boolean;
};
function message(worker: ServiceWorker, type: string): Promise<CacheReply> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error("缓存状态查询超时"));
    }, 15000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data);
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}

export function OfflineStatus() {
  const [phase, setPhase] = useState<
    "checking" | "caching" | "ready" | "error" | "unsupported"
  >("checking");
  const [online, setOnline] = useState(navigator.onLine);
  const [waiting, setWaiting] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const inspect = useRef<() => Promise<void>>(async () => {});
  const alive = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    alive.current = true;
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      setPhase("unsupported");
      return () => {
        alive.current = false;
      };
    }
    const base = import.meta.env.BASE_URL;
    const attached = new WeakSet<ServiceWorker>();
    async function check() {
      const reg = registration.current;
      if (!reg) return;
      if (alive.current) setWaiting(!!reg.waiting);
      if (reg.active) {
        try {
          const reply = await message(reg.active, "CACHE_STATUS");
          if (alive.current)
            setPhase(
              reply.ready
                ? "ready"
                : reg.installing || reg.waiting
                  ? "caching"
                  : "error",
            );
        } catch {
          if (alive.current) setPhase("error");
        }
      } else if (alive.current)
        setPhase(reg.installing || reg.waiting ? "caching" : "error");
    }
    inspect.current = check;
    function watch(reg: ServiceWorkerRegistration) {
      const worker = reg.installing;
      if (!worker || attached.has(worker)) return;
      attached.add(worker);
      if (alive.current && !reg.active) setPhase("caching");
      worker.addEventListener("statechange", () => {
        if (["installed", "activated", "redundant"].includes(worker.state))
          void check();
        if (navigator.onLine) void reg.update().catch(() => {});
      });
    }
    navigator.serviceWorker
      .getRegistration(base)
      .then((existing) =>
        existing?.scope === new URL(base, location.origin).href
          ? existing
          : navigator.serviceWorker.register(`${base}sw.js`, {
              scope: base,
              updateViaCache: "none",
            }),
      )
      .then((reg) => {
        if (!alive.current) return;
        registration.current = reg;
        reg.addEventListener("updatefound", () => watch(reg));
        watch(reg);
        void check();
      })
      .catch(() => {
        if (alive.current) setPhase("error");
      });
    function connection() {
      setOnline(navigator.onLine);
      void check();
      if (navigator.onLine) void registration.current?.update().catch(() => {});
    }
    function visible() {
      if (document.visibilityState === "visible") {
        void check();
        if (navigator.onLine)
          void registration.current?.update().catch(() => {});
      }
    }
    navigator.serviceWorker.addEventListener("controllerchange", check);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive.current = false;
      navigator.serviceWorker.removeEventListener("controllerchange", check);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  async function retry() {
    const reg = registration.current;
    if (!reg) {
      window.location.reload();
      return;
    }
    setPhase("caching");
    try {
      await reg.update();
      if (reg.active) await message(reg.active, "REPAIR_CACHE");
      await inspect.current();
    } catch {
      if (alive.current) setPhase("error");
    }
  }
  if (!import.meta.env.PROD) return null;
  const text =
    phase === "ready"
      ? online
        ? "90天课程已缓存，可离线学习"
        : "当前离线，90天课程可继续学习"
      : phase === "checking"
        ? "正在检查离线课程…"
        : phase === "caching"
          ? "正在缓存90天课程，请保持页面打开…"
          : phase === "unsupported"
            ? "当前浏览器未能启用离线缓存"
            : online
              ? "离线缓存未完成，请重试"
              : "当前离线，缓存未完成；恢复联网后可重试";
  return (
    <div className={`offline-banner offline-${phase}`} role="status">
      <span>{text}</span>
      {waiting && (
        <span className="offline-update">
          新版本已缓存。结束学习后，关闭全部课程窗口再重新打开即可更新。
        </span>
      )}
      {phase === "error" && online && (
        <button onClick={() => void retry()}>重试缓存</button>
      )}
    </div>
  );
}
