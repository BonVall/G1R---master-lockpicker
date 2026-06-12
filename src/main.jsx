import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const MIN_PINS = 3;
const MAX_PINS = 7;
const MIN_POSITION = 1;
const MAX_POSITION = 7;
const TARGET_POSITION = 4;

const EXAMPLE_POSITIONS = [7, 3, 2, 6, 2, 6];
const EXAMPLE_RELATIONS = {
  1: { 2: "opposite", 3: "opposite", 5: "opposite", 6: "opposite" },
  3: { 6: "opposite" },
  4: { 5: "same", 6: "opposite" },
  5: { 4: "same" },
  6: { 4: "opposite" },
};
const MUSIC_EMBED = "https://www.youtube-nocookie.com/embed/_4IRMYuE1hI";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const directionValue = (direction) => (direction === "D" ? 1 : -1);
const oppositeDirection = (direction) => (direction === "D" ? "A" : "D");
const relationLabel = {
  same: "ten sam",
  opposite: "przeciwny",
};

const stateKey = (state) => state.join(",");
const moveLabel = (move) => `${move.pin}${move.direction}`;

const normalizeState = (state, size) =>
  state
    .slice(0, size)
    .map((value) => clamp(Number(value) || TARGET_POSITION, MIN_POSITION, MAX_POSITION));

const wrapPosition = (value) =>
  ((value - MIN_POSITION) % MAX_POSITION + MAX_POSITION) % MAX_POSITION + MIN_POSITION;

const isSolved = (state) => state.every((value) => value === TARGET_POSITION);

function makeEmptyRelations(size) {
  return Object.fromEntries(
    Array.from({ length: size }, (_, sourceIndex) => [sourceIndex + 1, {}]),
  );
}

function resizeRelations(current, size) {
  const next = makeEmptyRelations(size);

  Object.entries(current).forEach(([source, targets]) => {
    const sourcePin = Number(source);
    if (sourcePin > size) {
      return;
    }

    Object.entries(targets).forEach(([target, relation]) => {
      const targetPin = Number(target);
      if (targetPin <= size && targetPin !== sourcePin) {
        next[sourcePin][targetPin] = relation;
      }
    });
  });

  return next;
}

function getRelation(relations, sourcePin, targetPin) {
  return relations[sourcePin]?.[targetPin] ?? null;
}

function getEffects(sourcePin, direction, relations) {
  return Object.entries(relations[sourcePin] ?? {}).map(([targetPin, relation]) => {
    const targetDirection = relation === "same" ? direction : oppositeDirection(direction);
    return {
      pin: Number(targetPin),
      direction: targetDirection,
    };
  });
}

function applyMove(state, relations, move) {
  const deltas = Array.from({ length: state.length }, () => 0);
  deltas[move.pin - 1] += directionValue(move.direction);

  getEffects(move.pin, move.direction, relations).forEach((effect) => {
    deltas[effect.pin - 1] += directionValue(effect.direction);
  });

  return state.map((value, index) => wrapPosition(value + deltas[index]));
}

function solveLock(startState, relations, size) {
  const start = normalizeState(startState, size);

  if (isSolved(start)) {
    return {
      status: "solved",
      moves: [],
      states: [start],
      visited: 1,
    };
  }

  const queue = [{ state: start, moves: [], states: [start] }];
  const visited = new Set([stateKey(start)]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];

    for (let pin = 1; pin <= size; pin += 1) {
      for (const direction of ["A", "D"]) {
        const move = { pin, direction };
        const nextState = applyMove(current.state, relations, move);
        const key = stateKey(nextState);

        if (visited.has(key)) {
          continue;
        }

        const nextMoves = [...current.moves, move];
        const nextStates = [...current.states, nextState];

        if (isSolved(nextState)) {
          return {
            status: "solved",
            moves: nextMoves,
            states: nextStates,
            visited: visited.size + 1,
          };
        }

        visited.add(key);
        queue.push({ state: nextState, moves: nextMoves, states: nextStates });
      }
    }
  }

  return {
    status: "unsolved",
    moves: [],
    states: [start],
    visited: visited.size,
  };
}

function relationSummary(sourcePin, relations) {
  const effects = Object.entries(relations[sourcePin] ?? {});
  if (effects.length === 0) {
    return "ruch niezależny";
  }

  return effects
    .map(([target, relation]) => `${target}: ${relationLabel[relation]}`)
    .join(", ");
}

function formatRelations(relations, size) {
  return Array.from({ length: size }, (_, index) => {
    const sourcePin = index + 1;
    return `${sourcePin}: ${relationSummary(sourcePin, relations)}`;
  }).join("\n");
}

function formatExport(size, startState, relations, result) {
  const lines = [
    "G1 Master Lockpicker",
    `Liczba zapadek: ${size}`,
    `Cel: kazda zapadka na oczku ${TARGET_POSITION}`,
    `Pozycje startowe: ${startState.map((value, index) => `${index + 1}:${value}`).join(" ")}`,
    "",
    "Zaleznosci:",
    formatRelations(relations, size),
    "",
  ];

  if (result.status === "solved") {
    lines.push(`Sekwencja (${result.moves.length}): ${result.moves.length ? result.moves.map(moveLabel).join(" -> ") : "brak ruchow"}`);
    lines.push("");
    lines.push("Stany:");
    result.states.forEach((state, index) => {
      const prefix = index === 0 ? "Start" : `Po ${moveLabel(result.moves[index - 1])}`;
      lines.push(`${prefix}: ${state.join(" ")}`);
    });
  } else {
    lines.push("Brak rozwiazania dla podanej konfiguracji.");
  }

  lines.push("");
  lines.push(`Odwiedzone stany: ${result.visited}`);
  return lines.join("\n");
}

const Icon = ({ children }) => (
  <span className="button-icon" aria-hidden="true">
    {children}
  </span>
);

function RelationButton({ active, children, onClick }) {
  return (
    <button className={active ? "relation-button active" : "relation-button"} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function App() {
  const [pinCount, setPinCount] = useState(6);
  const [positions, setPositions] = useState(EXAMPLE_POSITIONS);
  const [relations, setRelations] = useState(() => resizeRelations(EXAMPLE_RELATIONS, 6));
  const [result, setResult] = useState(null);

  const normalizedPositions = useMemo(
    () => normalizeState(positions, pinCount),
    [positions, pinCount],
  );

  const solvedPreview = useMemo(
    () => normalizedPositions.every((position) => position === TARGET_POSITION),
    [normalizedPositions],
  );

  const resizePuzzle = (size) => {
    const nextSize = clamp(Number(size) || MIN_PINS, MIN_PINS, MAX_PINS);
    setPinCount(nextSize);
    setPositions((current) => {
      const resized = normalizeState(current, nextSize);
      while (resized.length < nextSize) {
        resized.push(TARGET_POSITION);
      }
      return resized;
    });
    setRelations((current) => resizeRelations(current, nextSize));
    setResult(null);
  };

  const updatePosition = (index, value) => {
    setPositions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? clamp(Number(value) || TARGET_POSITION, MIN_POSITION, MAX_POSITION)
          : item,
      ),
    );
    setResult(null);
  };

  const setRelation = (sourcePin, targetPin, relation) => {
    setRelations((current) => {
      const next = resizeRelations(current, pinCount);
      const currentRelation = next[sourcePin][targetPin] ?? null;

      if (currentRelation === relation) {
        delete next[sourcePin][targetPin];
      } else {
        next[sourcePin][targetPin] = relation;
      }

      return next;
    });
    setResult(null);
  };

  const clearRelations = (sourcePin) => {
    setRelations((current) => ({
      ...current,
      [sourcePin]: {},
    }));
    setResult(null);
  };

  const solve = () => {
    setResult(solveLock(normalizedPositions, relations, pinCount));
  };

  const exportResult = () => {
    const activeResult = result ?? solveLock(normalizedPositions, relations, pinCount);
    const text = formatExport(pinCount, normalizedPositions, relations, activeResult);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "g1-master-lockpicker-result.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <div className="finger-pointer" aria-hidden="true" />
      <aside className="music-player" aria-label="Odtwarzacz muzyki">
        <span>Soundtrack</span>
        <iframe
          title="Odtwarzacz muzyki"
          src={MUSIC_EMBED}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Solver zamka G1</p>
            <h1>G1 Remake - Otwieracz Skrzynek Bożych</h1>
            <p className="hero-note">
              Wpisz oczka zapadek. Zależności ustawiasz kliknięciem: ten sam kierunek albo przeciwny.
              Każdy ruch przesuwa zapadkę dokładnie o jedno oczko, a celem jest komplet na 4.
            </p>
          </div>
          <div className="actions">
            <button className="primary-button" type="button" onClick={solve}>
              <Icon>▶</Icon>
              Rozwiąż
            </button>
          </div>
        </header>

        <section className="control-band" aria-label="Pozycje zapadek">
          <label className="field">
            <span>Liczba zapadek</span>
            <input
              type="number"
              min={MIN_PINS}
              max={MAX_PINS}
              value={pinCount}
              onChange={(event) => resizePuzzle(event.target.value)}
            />
          </label>

          <div className="positions" aria-label="Oczka zapadek">
            {Array.from({ length: pinCount }, (_, index) => (
              <label className="tile-input" key={index}>
                <span>Zapadka {index + 1}</span>
                <input
                  type="number"
                  min={MIN_POSITION}
                  max={MAX_POSITION}
                  value={normalizedPositions[index]}
                  onChange={(event) => updatePosition(index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="relations-section" aria-label="Zależności ruchu zapadek">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Zależności</p>
              <h2>Co porusza się razem?</h2>
            </div>
            <p>
              Dla każdej zapadki kliknij numery, które ruszają razem z nią. Puste oznacza ruch niezależny.
            </p>
          </div>

          <div className="relation-grid">
            {Array.from({ length: pinCount }, (_, sourceIndex) => {
              const sourcePin = sourceIndex + 1;
              const targets = Array.from({ length: pinCount }, (_, targetIndex) => targetIndex + 1)
                .filter((targetPin) => targetPin !== sourcePin);
              const isFree = Object.keys(relations[sourcePin] ?? {}).length === 0;

              return (
                <article className="relation-card" key={sourcePin}>
                  <div className="relation-card-top">
                    <div>
                      <h3>Zapadka {sourcePin}</h3>
                      <p>{isFree ? "rusza tylko siebie" : relationSummary(sourcePin, relations)}</p>
                    </div>
                    <button className={isFree ? "free-button active" : "free-button"} type="button" onClick={() => clearRelations(sourcePin)}>
                      Niezależna
                    </button>
                  </div>

                  <div className="relation-row">
                    <span>Ten sam kierunek</span>
                    <div className="relation-buttons">
                      {targets.map((targetPin) => (
                        <RelationButton
                          key={`${sourcePin}-same-${targetPin}`}
                          active={getRelation(relations, sourcePin, targetPin) === "same"}
                          onClick={() => setRelation(sourcePin, targetPin, "same")}
                        >
                          {targetPin}
                        </RelationButton>
                      ))}
                    </div>
                  </div>

                  <div className="relation-row">
                    <span>Przeciwny kierunek</span>
                    <div className="relation-buttons">
                      {targets.map((targetPin) => (
                        <RelationButton
                          key={`${sourcePin}-opposite-${targetPin}`}
                          active={getRelation(relations, sourcePin, targetPin) === "opposite"}
                          onClick={() => setRelation(sourcePin, targetPin, "opposite")}
                        >
                          {targetPin}
                        </RelationButton>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="result-band" aria-live="polite">
          <div className="result-heading">
            <div>
              <p className="eyebrow">Wynik</p>
              <h2>Ruchy do wykonania</h2>
            </div>
            <button className="ghost-button" type="button" onClick={exportResult} title="Eksportuj wynik do tekstu">
              <Icon>⇩</Icon>
              Eksport
            </button>
          </div>

          {!result && (
            <div className={solvedPreview ? "empty-state solved-note" : "empty-state"}>
              {solvedPreview
                ? "Wszystkie zapadki są już na oczku 4."
                : "Ustaw oczka i zależności, potem kliknij Rozwiąż."}
            </div>
          )}

          {result?.status === "unsolved" && (
            <div className="status-box warning">
              Nie znaleziono rozwiązania. Przeszukano {result.visited} stanów.
            </div>
          )}

          {result?.status === "solved" && (
            <>
              <div className="status-box">
                <strong>
                  {result.moves.length === 0
                    ? "Zamek jest już otwarty."
                    : result.moves.map(moveLabel).join(" -> ")}
                </strong>
                <span>{result.moves.length} ruchów, {result.visited} odwiedzonych stanów</span>
              </div>

              <div className="move-list">
                {result.moves.map((move, index) => (
                  <div className="move-step" key={`${index}-${moveLabel(move)}`}>
                    <span>{index + 1}</span>
                    <strong>{moveLabel(move)}</strong>
                  </div>
                ))}
              </div>

              <div className="timeline">
                {result.states.map((state, index) => (
                  <article className="state-card" key={`${index}-${stateKey(state)}`}>
                    <div className="state-title">
                      <span>{index === 0 ? "Start" : `Po ${moveLabel(result.moves[index - 1])}`}</span>
                    </div>
                    <div className="state-row" style={{ "--tile-count": pinCount }}>
                      {state.map((value, pinIndex) => (
                        <span className={value === TARGET_POSITION ? "solved tile" : "tile"} key={pinIndex}>
                          {value}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
