import { useEffect, useRef, useState } from "react";

const JSDOS_CSS_URL = "https://v8.js-dos.com/latest/js-dos.css";
const JSDOS_SCRIPT_URL = "https://v8.js-dos.com/latest/js-dos.js";

type ArtifactCategory = "collectible" | "obstacle" | "enemy";

type Artifact = {
  id: string;
  label: string;
  category: ArtifactCategory;
  description: string;
  transparent: string;
  scaled4x: string;
};

type QuizQuestion = {
  question: string;
  answers: string[];
  correct: number;
};

const CATEGORY_LABELS: Record<ArtifactCategory, string> = {
  collectible: "Artifacts and pickups",
  obstacle: "Obstacles",
  enemy: "Enemies",
};

const CATEGORY_ORDER: ArtifactCategory[] = ["collectible", "obstacle", "enemy"];
const QUESTIONS_PER_MINI_QUIZ = 10;

function publicUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

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
  const response = await fetch(publicUrl("/games/exodus.jsdos"), {
    method: "HEAD",
  });

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
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [activeQuizSection, setActiveQuizSection] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    let isMounted = true;

    async function loadArtifacts() {
      try {
        const response = await fetch(
          publicUrl("/assets/exodus_artifacts/manifest.json")
        );

        if (!response.ok) {
          throw new Error("Artifact guide is unavailable.");
        }

        const manifest = (await response.json()) as Artifact[];

        if (isMounted) {
          setArtifacts(manifest);
        }
      } catch (nextError) {
        if (isMounted) {
          setArtifactError(
            nextError instanceof Error
              ? nextError.message
              : "Artifact guide is unavailable."
          );
        }
      }
    }

    loadArtifacts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadQuizzes() {
      try {
        const response = await fetch(publicUrl("/assets/exodus_quizzes.json"));

        if (!response.ok) {
          throw new Error("Quiz archive is unavailable.");
        }

        const questions = (await response.json()) as QuizQuestion[];

        if (isMounted) {
          setQuizzes(questions);
        }
      } catch (nextError) {
        if (isMounted) {
          setQuizError(
            nextError instanceof Error
              ? nextError.message
              : "Quiz archive is unavailable."
          );
        }
      }
    }

    loadQuizzes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootPlayer() {
      if (isGuideOpen) {
        return;
      }

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
          url: publicUrl("/games/exodus.jsdos"),
          autoStart: true,
        });
        setStatus("Progress is controlled inside the original DOS game.");
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
  }, [isGuideOpen]);

  useEffect(() => {
    if (!isGuideOpen || window.location.hash !== "#quizzes") {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("quizzes")?.scrollIntoView();
    });
  }, [isGuideOpen, quizzes.length]);

  async function handleRestart() {
    if (isRestarting) {
      return;
    }

    try {
      setIsRestarting(true);
      setStatus("Restarting game...");
      await dosControllerRef.current?.stop();
    } finally {
      window.location.reload();
    }
  }

  function handleFullscreen() {
    dosControllerRef.current?.setFullScreen(true);
  }

  function groupedArtifacts(category: ArtifactCategory) {
    return artifacts.filter((artifact) => artifact.category === category);
  }

  function selectQuizSection(nextSection: number) {
    const sectionCount = Math.ceil(quizzes.length / QUESTIONS_PER_MINI_QUIZ);

    if (sectionCount === 0) {
      return;
    }

    const wrappedSection = (nextSection + sectionCount) % sectionCount;
    setActiveQuizSection(wrappedSection);
    setActiveQuestionIndex(0);
  }

  function selectQuizAnswer(globalQuestionIndex: number, answerIndex: number) {
    setSelectedAnswers((currentAnswers) => ({
      ...currentAnswers,
      [globalQuestionIndex]: answerIndex,
    }));
  }

  const quizSections = Array.from(
    { length: Math.ceil(quizzes.length / QUESTIONS_PER_MINI_QUIZ) },
    (_, index) =>
      quizzes.slice(
        index * QUESTIONS_PER_MINI_QUIZ,
        (index + 1) * QUESTIONS_PER_MINI_QUIZ
      )
  );
  const activeSection = quizSections[activeQuizSection] ?? [];
  const activeQuiz = activeSection[activeQuestionIndex];
  const activeGlobalQuestionIndex =
    activeQuizSection * QUESTIONS_PER_MINI_QUIZ + activeQuestionIndex;
  const selectedAnswer = selectedAnswers[activeGlobalQuestionIndex];
  const answeredInSection = activeSection.filter((_, index) => {
    const globalIndex = activeQuizSection * QUESTIONS_PER_MINI_QUIZ + index;
    return selectedAnswers[globalIndex] !== undefined;
  }).length;
  const sectionScore = activeSection.reduce((score, question, index) => {
    const globalIndex = activeQuizSection * QUESTIONS_PER_MINI_QUIZ + index;
    return selectedAnswers[globalIndex] === question.correct ? score + 1 : score;
  }, 0);

  if (isGuideOpen) {
    return (
      <main className="guideShell">
        <section className="guideHero" aria-labelledby="guide-title">
          <div className="guideHeroContent">
            <p className="eyebrow">Secret Archive</p>
            <h1 id="guide-title">Exodus</h1>
            <p className="heroLead">
              Lead Moses through each level by gathering every omer of manna,
              collecting hidden artifacts, and answering the Bible quiz between
              stages.
            </p>
            <div className="heroActions">
              <button
                className="controlButton primary"
                type="button"
                onClick={() => setIsGuideOpen(false)}
              >
                Continue to game
              </button>
              <a className="controlButton calendarButton" href="/">
                Back to calendar
              </a>
            </div>
          </div>

          <div className="quickGuide" aria-label="Before you play">
            <div>
              <span className="guideLabel">Goal</span>
              <strong>Collect all manna and secret artifacts.</strong>
            </div>
            <div>
              <span className="guideLabel">Between levels</span>
              <strong>Answer a Bible quiz from Exodus.</strong>
            </div>
            <div>
              <span className="guideLabel">Button 1</span>
              <strong>Space bar speaks the Word.</strong>
            </div>
            <div>
              <span className="guideLabel">Button 2</span>
              <strong>Enter drops the staff.</strong>
            </div>
          </div>
        </section>

        <section className="aboutGame" aria-labelledby="about-title">
          <div className="coverFrame">
            <img
              src={publicUrl("/Exodus_Coverart.png")}
              alt="Exodus: Journey to the Promised Land cover art"
            />
          </div>
          <div className="aboutCopy">
            <p className="eyebrow">About the Game</p>
            <h2 id="about-title">Journey to the Promised Land</h2>
            <p>
              Exodus: Journey to the Promised Land is a Wisdom Tree game based
              on the earlier Color Dreams game Crystal Mines. You guide Moses
              through maze-like levels, using the Word of God to clear enemies
              and obstacles while collecting manna and question marks.
            </p>
            <p>
              Each level requires five question marks and enough manna to
              finish. Between levels, players answer Bible quiz questions before
              moving forward.
            </p>
          </div>
        </section>

        <section className="controlsBand" aria-label="Controls">
          <div className="keyCard">
            <span className="keycap">Space</span>
            <div>
              <h2>Button 1: Word</h2>
              <p>Use the Word of God to remove enemies and obstacles.</p>
            </div>
          </div>
          <div className="keyCard">
            <span className="keycap">Enter</span>
            <div>
              <h2>Button 2: Staff</h2>
              <p>Drop the staff when an object requires staff power.</p>
            </div>
          </div>
          <div className="keyCard">
            <span className="keycap">Arrows</span>
            <div>
              <h2>Move Moses</h2>
              <p>Navigate the maze, push blocks, and avoid hazards.</p>
            </div>
          </div>
        </section>

        <section
          className="quizArchive"
          id="quizzes"
          aria-labelledby="quiz-title"
        >
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Bible Quiz</p>
              <h2 id="quiz-title">Take the between-level quizzes</h2>
            </div>
            <span className="quizCount">
              {quizzes.length > 0
                ? `${quizSections.length} mini-quizzes`
                : "Loading"}
            </span>
          </div>

          {quizError ? (
            <div className="messageBox" role="alert">
              <strong>Quiz archive unavailable</strong>
              <p>{quizError}</p>
            </div>
          ) : activeQuiz ? (
            <div className="quizActivity">
              <nav className="quizSectionPicker" aria-label="Mini quizzes">
                {quizSections.map((section, index) => {
                  const start = index * QUESTIONS_PER_MINI_QUIZ + 1;
                  const end = start + section.length - 1;

                  return (
                    <button
                      className={
                        index === activeQuizSection
                          ? "sectionButton active"
                          : "sectionButton"
                      }
                      type="button"
                      key={`quiz-section-${index}`}
                      onClick={() => selectQuizSection(index)}
                    >
                      <span>Quiz {index + 1}</span>
                      <small>
                        {start}-{end}
                      </small>
                    </button>
                  );
                })}
              </nav>

              <article className="quizCard">
                <div className="quizTopline">
                  <div className="quizMeta">
                    Quiz {activeQuizSection + 1} · Question{" "}
                    {activeQuestionIndex + 1} of {activeSection.length}
                  </div>
                  <div className="quizScore">
                    {sectionScore}/{answeredInSection}
                  </div>
                </div>
                <div
                  className="questionStepper"
                  aria-label="Questions in selected quiz"
                >
                  {activeSection.map((question, index) => {
                    const globalIndex =
                      activeQuizSection * QUESTIONS_PER_MINI_QUIZ + index;
                    const answer = selectedAnswers[globalIndex];
                    const isCorrect = answer === question.correct;

                    return (
                      <button
                        className={[
                          "questionDot",
                          index === activeQuestionIndex ? "active" : "",
                          answer !== undefined
                            ? isCorrect
                              ? "correct"
                              : "incorrect"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        type="button"
                        key={`question-${globalIndex}`}
                        onClick={() => setActiveQuestionIndex(index)}
                        aria-label={`Question ${index + 1}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <h3>{activeQuiz.question}</h3>
                <div className="answerList">
                  {activeQuiz.answers.map((answer, index) => {
                    const hasAnswered = selectedAnswer !== undefined;
                    const isSelected = selectedAnswer === index;
                    const isCorrect = activeQuiz.correct === index;

                    return (
                      <button
                        className={[
                          "answerChoice",
                          isSelected ? "selected" : "",
                          hasAnswered && isCorrect ? "correct" : "",
                          hasAnswered && isSelected && !isCorrect
                            ? "incorrect"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        type="button"
                        key={`${activeQuiz.question}-${answer}`}
                        onClick={() =>
                          selectQuizAnswer(activeGlobalQuestionIndex, index)
                        }
                      >
                        <span>{String.fromCharCode(65 + index)}</span>
                        {answer}
                      </button>
                    );
                  })}
                </div>
                <div className="quizActions">
                  <button
                    className="controlButton"
                    type="button"
                    onClick={() =>
                      setActiveQuestionIndex(
                        (activeQuestionIndex - 1 + activeSection.length) %
                          activeSection.length
                      )
                    }
                  >
                    Previous
                  </button>
                  <button
                    className="controlButton primary"
                    type="button"
                    onClick={() =>
                      setActiveQuestionIndex(
                        (activeQuestionIndex + 1) % activeSection.length
                      )
                    }
                  >
                    Next question
                  </button>
                  <button
                    className="controlButton"
                    type="button"
                    onClick={() => selectQuizSection(activeQuizSection + 1)}
                  >
                    Next quiz
                  </button>
                </div>
              </article>
            </div>
          ) : (
            <div className="messageBox" role="status">
              <strong>Loading quiz archive</strong>
            </div>
          )}
        </section>

        <section className="artifactGuide" aria-labelledby="artifact-title">
          <div className="sectionHeader">
            <p className="eyebrow">Field Guide</p>
            <h2 id="artifact-title">Artifacts and objects</h2>
          </div>

          {artifactError ? (
            <div className="messageBox" role="alert">
              <strong>Artifact guide unavailable</strong>
              <p>{artifactError}</p>
            </div>
          ) : (
            CATEGORY_ORDER.map((category) => (
              <div className="artifactGroup" key={category}>
                <h3>{CATEGORY_LABELS[category]}</h3>
                <div className="artifactGrid">
                  {groupedArtifacts(category).map((artifact) => (
                    <article className="artifactCard" key={artifact.id}>
                      <div className="artifactIcon">
                        <img
                          src={publicUrl(
                            `/assets/exodus_artifacts/${artifact.scaled4x}`
                          )}
                          alt=""
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <h4>{artifact.label}</h4>
                        <p>{artifact.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    );
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
                onClick={handleRestart}
                disabled={!dosControllerRef.current || isRestarting}
              >
                {isRestarting ? "Restarting..." : "Restart"}
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
