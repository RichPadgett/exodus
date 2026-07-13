import { useEffect, useRef, useState } from "react";

const JSDOS_CSS_URL = "https://v8.js-dos.com/latest/js-dos.css";
const JSDOS_SCRIPT_URL = "https://v8.js-dos.com/latest/js-dos.js";
const GAME_BUNDLE_URL = "/exodus/games/exodus.jsdos";

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
  const [isSaving, setIsSaving] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

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
        setStatus("Use Save before leaving, then Load Saved to resume.");
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

  async function handleSave() {
    if (!dosControllerRef.current || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setStatus("Saving game...");
      await dosControllerRef.current.save();
      setStatus(`Saved ${new Date().toLocaleTimeString()}.`);
    } catch (nextError) {
      setStatus(
        nextError instanceof Error
          ? `Save failed: ${nextError.message}`
          : "Save failed."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoadSaved() {
    if (isRestarting) {
      return;
    }

    try {
      setIsRestarting(true);
      setStatus("Loading saved game...");
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
              <button
                className="controlButton primary"
                type="button"
                onClick={handleSave}
                disabled={!dosControllerRef.current || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                className="controlButton"
                type="button"
                onClick={handleLoadSaved}
                disabled={!dosControllerRef.current || isRestarting}
              >
                {isRestarting ? "Loading..." : "Load Saved"}
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
