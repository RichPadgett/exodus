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
  const hasStartedRef = useRef(false);
  const [status, setStatus] = useState("Preparing DOS player...");
  const [error, setError] = useState<string | null>(null);

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
        window.Dos(dosContainerRef.current, {
          url: GAME_BUNDLE_URL,
          autoStart: true,
        });
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
            <p className="statusText">{status}</p>
          </>
        )}
      </section>
    </main>
  );
}
