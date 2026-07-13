import { useEffect, useRef, useState } from "react";

const JSDOS_CSS_URL = "https://v8.js-dos.com/latest/js-dos.css";
const JSDOS_SCRIPT_URL = "https://v8.js-dos.com/latest/js-dos.js";
const GAME_BUNDLE_URL = "/exodus/games/exodus.jsdos";
const CHECKPOINT_STORAGE_KEY = "exodusCheckpointLevel";

let jsDosScriptPromise: Promise<void> | null = null;

function loadStylesheet(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string) {
  if (jsDosScriptPromise) {
    return jsDosScriptPromise;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${src}"]`
  );

  if (existingScript && window.Dos) {
    jsDosScriptPromise = Promise.resolve();
    return jsDosScriptPromise;
  }

  jsDosScriptPromise = new Promise<void>((resolve, reject) => {
    const script = existingScript ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}`));

    if (!existingScript) {
      document.body.appendChild(script);
    }
  });

  return jsDosScriptPromise;
}

async function assertGameBundleExists() {
  const response = await fetch(GAME_BUNDLE_URL, { method: "HEAD" });

  if (!response.ok) {
    throw new Error("Missing game bundle. Run npm run bundle:game.");
  }
}

export default function App() {
  const dosContainerRef = useRef<HTMLDivElement | null>(null);
  const dosControllerRef = useRef<DosController | null>(null);
  const hasStartedRef = useRef(false);
  const [status, setStatus] = useState("Preparing DOS player...");
  const [error, setError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [checkpointLevel, setCheckpointLevel] = useState("1");
  const [savedCheckpointLevel, setSavedCheckpointLevel] = useState<
    string | null
  >(null);

  useEffect(() => {
    const savedLevel = window.localStorage.getItem(CHECKPOINT_STORAGE_KEY);

    if (savedLevel) {
      setCheckpointLevel(savedLevel);
      setSavedCheckpointLevel(savedLevel);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootPlayer() {
      try {
        await assertGameBundleExists();
        loadStylesheet(JSDOS_CSS_URL);
        await loadScript(JSDOS_SCRIPT_URL);

        if (!isMounted || !dosContainerRef.current || hasStartedRef.current) {
          return;
        }

        if (!window.Dos) {
          throw new Error("The DOS emulator did not initialize.");
        }

        hasStartedRef.current = true;
        setStatus("Loading Exodus...");
        dosControllerRef.current = window.Dos(dosContainerRef.current, {
          url: GAME_BUNDLE_URL,
          autoStart: true,
        });
        setStatus("Ready.");
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "The DOS player could not start."
        );
      }
    }

    bootPlayer();

    return () => {
      isMounted = false;
    };
  }, []);

  function normalizeCheckpointLevel(value: string) {
    const parsedLevel = Number.parseInt(value, 10);

    if (Number.isNaN(parsedLevel)) {
      return "1";
    }

    return String(Math.min(Math.max(parsedLevel, 1), 100));
  }

  function handleSaveCheckpoint() {
    const normalizedLevel = normalizeCheckpointLevel(checkpointLevel);

    setCheckpointLevel(normalizedLevel);
    setSavedCheckpointLevel(normalizedLevel);
    window.localStorage.setItem(CHECKPOINT_STORAGE_KEY, normalizedLevel);
    setStatus(`Checkpoint level ${normalizedLevel} saved in this browser.`);
  }

  async function handleResumeCheckpoint() {
    if (isRestarting) {
      return;
    }

    if (!savedCheckpointLevel) {
      setStatus("Choose a level and save a checkpoint first.");
      return;
    }

    try {
      setIsRestarting(true);
      setStatus(
        `Restarting. Use the game password/level menu for level ${savedCheckpointLevel}.`
      );
      await dosControllerRef.current?.stop();
    } finally {
      window.location.reload();
    }
  }

  function handleFullscreen() {
    dosControllerRef.current?.setFullScreen(true);
  }

  return (
    <main className="shell">
      <section className="playerPanel" aria-label="Exodus DOS player">
        <div className="playerHeader">
          <div>
            <p className="eyebrow">Secret Archive</p>
            <h1>Exodus</h1>
          </div>
          <span className="routeBadge">/exodus</span>
        </div>

        {error ? (
          <div className="messageBox" role="alert">
            <strong>Player unavailable</strong>
            <p>{error}</p>
            {error.includes("bundle") ? (
              <p>
                Run <code>npm run bundle:game</code> before building or serving
                this project.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div ref={dosContainerRef} className="dosViewport" />
            <div className="controlBar" aria-label="Game controls">
              <label className="levelControl">
                <span>Level</span>
                <input
                  aria-label="Checkpoint level"
                  inputMode="numeric"
                  max="100"
                  min="1"
                  type="number"
                  value={checkpointLevel}
                  onBlur={(event) =>
                    setCheckpointLevel(
                      normalizeCheckpointLevel(event.currentTarget.value)
                    )
                  }
                  onChange={(event) => setCheckpointLevel(event.target.value)}
                />
              </label>
              <button
                className="controlButton primary"
                type="button"
                onClick={handleSaveCheckpoint}
              >
                Save Checkpoint
              </button>
              <button
                className="controlButton"
                type="button"
                onClick={handleResumeCheckpoint}
                disabled={!dosControllerRef.current || isRestarting}
              >
                {isRestarting ? "Restarting..." : "Resume Checkpoint"}
              </button>
              <button
                className="controlButton"
                type="button"
                onClick={handleFullscreen}
                disabled={!dosControllerRef.current}
              >
                Fullscreen
              </button>
            </div>
            <p className="statusText" role="status">
              {status}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
