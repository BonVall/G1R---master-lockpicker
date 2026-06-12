import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const MIN_PINS = 3;
const MAX_PINS = 7;
const MIN_POSITION = 1;
const MAX_POSITION = 7;
const TARGET_POSITION = 4;

const EXAMPLE_POSITIONS = [7, 3, 2, 6, 2, 6];
const EXAMPLE_RULES = `1D = 2A, 3A, 5A, 6A
2A = A
3A = 6D
4D = 5D, 6A
5D = 4D
6D = 4A`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const directionValue = (direction) => (direction === "D" ? 1 : -1);
const oppositeDirection = (direction) => (direction === "D" ? "A" : "D");
const stateKey = (state) => state.join(",");
const moveKey = (pin, direction) => `${pin}${direction}`;
const moveLabel = (move) => `${move.pin}${move.direction}`;

const normalizeState = (state, size) =>
  state
    .slice(0, size)
    .map((value) => clamp(Number(value) || TARGET_POSITION, MIN_POSITION, MAX_POSITION));

const wrapPosition = (value) =>
  ((value - MIN_POSITION) % MAX_POSITION + MAX_POSITION) % MAX_POSITION + MIN_POSITION;

const isSolved = (state) => state.every((value) => value === TARGET_POSITION);

function parseRules(text, size) {
  const rules = new Map();
  const errors = [];

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, lineIndex) => {
      const normalized = line.replace(/\s+/g, "").toUpperCase();
      const [left, right = ""] = normalized.split("=");
      const source = left.match(/^([1-7])([AD])$/);

      if (!source) {
        errors.push(`Linia ${lineIndex + 1}: lewa strona musi wyglądać jak 1D albo 3A.`);
        return;
      }

      const sourcePin = Number(source[1]);
      const sourceDirection = source[2];

      if (sourcePin > size) {
        errors.push(`Linia ${lineIndex + 1}: zapadka ${sourcePin} nie istnieje przy tej liczbie zapadek.`);
        return;
      }

      const effects = [];
      const tokens = right.split(",").map((token) => token.trim()).filter(Boolean);

      tokens.forEach((token) => {
        const selfOnly = token.match(/^[AD]$/);
        const dependent = token.match(/^([1-7])([AD])$/);

        if (selfOnly) {
          return;
        }

        if (!dependent) {
          errors.push(`Linia ${lineIndex + 1}: "${token}" powinno wyglądać jak 2A albo 6D.`);
          return;
        }

        const targetPin = Number(dependent[1]);
        const targetDirection = dependent[2];

        if (targetPin > size) {
          errors.push(`Linia ${lineIndex + 1}: zapadka ${targetPin} nie istnieje przy tej liczbie zapadek.`);
          return;
        }

        if (targetPin !== sourcePin) {
          effects.push({ pin: targetPin, direction: targetDirection });
        }
      });

      rules.set(moveKey(sourcePin, sourceDirection), effects);
    });

  return { rules, errors };
}

function getEffects(pin, direction, rules) {
  const direct = rules.get(moveKey(pin, direction));

  if (direct) {
    return direct;
  }

  const inverse = rules.get(moveKey(pin, oppositeDirection(direction)));

  if (!inverse) {
    return [];
  }

  return inverse.map((effect) => ({
    pin: effect.pin,
    direction: oppositeDirection(effect.direction),
  }));
}

function applyMove(state, rules, move) {
  const deltas = Array.from({ length: state.length }, () => 0);
  deltas[move.pin - 1] += directionValue(move.direction);

  getEffects(move.pin, move.direction, rules).forEach((effect) => {
    deltas[effect.pin - 1] += directionValue(effect.direction);
  });

  return state.map((value, index) => wrapPosition(value + deltas[index]));
}

function solveLock(startState, rules, size) {
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
        const nextState = applyMove(current.state, rules, move);
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

function formatExport(size, startState, rulesText, result) {
  const lines = [
    "G1 Master Lockpicker",
    `Liczba zapadek: ${size}`,
    `Cel: kazda zapadka na oczku ${TARGET_POSITION}`,
    `Pozycje startowe: ${startState.map((value, index) => `${index + 1}:${value}`).join(" ")}`,
    "",
    "Zaleznosci:",
    rulesText.trim() || "brak zaleznosci",
    "",
  ];

  if (result.status === "solved") {
    lines.push(`Najkrotsza sekwencja (${result.moves.length}): ${result.moves.length ? result.moves.map(moveLabel).join(" -> ") : "brak ruchow"}`);
    lines.push("");
    lines.push("Podglad stanow:");
    result.states.forEach((state, index) => {
      const prefix = index === 0 ? "Start" : `Po ruchu ${index} (${moveLabel(result.moves[index - 1])})`;
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

function App() {
  const [pinCount, setPinCount] = useState(6);
  const [positions, setPositions] = useState(EXAMPLE_POSITIONS);
  const [rulesText, setRulesText] = useState(EXAMPLE_RULES);
  const [result, setResult] = useState(null);

  const normalizedPositions = useMemo(
    () => normalizeState(positions, pinCount),
    [positions, pinCount],
  );

  const parsedRules = useMemo(
    () => parseRules(rulesText, pinCount),
    [rulesText, pinCount],
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

  const resetExample = () => {
    setPinCount(6);
    setPositions(EXAMPLE_POSITIONS);
    setRulesText(EXAMPLE_RULES);
    setResult(null);
  };

  const solve = () => {
    if (parsedRules.errors.length > 0) {
      setResult(null);
      return;
    }

    setResult(solveLock(normalizedPositions, parsedRules.rules, pinCount));
  };

  const exportResult = () => {
    if (parsedRules.errors.length > 0) {
      return;
    }

    const activeResult = result ?? solveLock(normalizedPositions, parsedRules.rules, pinCount);
    const text = formatExport(pinCount, normalizedPositions, rulesText, activeResult);
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
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Solver zamka G1</p>
            <h1>G1 Master Lockpicker</h1>
            <p className="hero-note">
              Wpisz oczko każdej zapadki i zależności ruchu. A oznacza ruch w lewo,
              D ruch w prawo. Zamek otwiera się, gdy wszystkie zapadki stoją na oczku 4.
            </p>
          </div>
          <div className="actions">
            <button className="ghost-button" type="button" onClick={resetExample} title="Wczytaj przykład">
              <Icon>↺</Icon>
              Przykład
            </button>
            <button className="primary-button" type="button" onClick={solve} disabled={parsedRules.errors.length > 0}>
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

        <section className="rules-section" aria-label="Zależności ruchu">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A / D</p>
              <h2>Zależności ruchu</h2>
            </div>
            <p>
              Wpisuj po jednej zależności na linię, np. <strong>1D = 2A, 3A</strong>.
              Ruch odwrotny jest liczony automatycznie.
            </p>
          </div>

          <textarea
            className="rules-input"
            spellCheck="false"
            value={rulesText}
            onChange={(event) => {
              setRulesText(event.target.value);
              setResult(null);
            }}
            aria-label="Zależności ruchu zapadek"
          />

          <div className="legend">
            <span><strong>A</strong> lewo</span>
            <span><strong>D</strong> prawo</span>
            <span><strong>1D = 2A</strong> gdy 1 idzie w prawo, 2 idzie w lewo</span>
            <span><strong>2A = A</strong> ruch niezależny, bez innych zapadek</span>
          </div>

          {parsedRules.errors.length > 0 && (
            <div className="status-box warning">
              <strong>Popraw zależności:</strong>
              <span>{parsedRules.errors.join(" ")}</span>
            </div>
          )}
        </section>

        <section className="result-band" aria-live="polite">
          <div className="result-heading">
            <div>
              <p className="eyebrow">BFS</p>
              <h2>Wynik</h2>
            </div>
            <button className="ghost-button" type="button" onClick={exportResult} disabled={parsedRules.errors.length > 0} title="Eksportuj wynik do tekstu">
              <Icon>⇩</Icon>
              Eksport
            </button>
          </div>

          {!result && parsedRules.errors.length === 0 && (
            <div className="empty-state">
              Ustaw oczka i zależności, potem uruchom szukanie najkrótszej sekwencji.
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
                    : `Sekwencja: ${result.moves.map(moveLabel).join(" -> ")}`}
                </strong>
                <span>{result.moves.length} ruchów, {result.visited} odwiedzonych stanów</span>
              </div>

              <div className="timeline">
                {result.states.map((state, index) => (
                  <article className="state-card" key={`${index}-${stateKey(state)}`}>
                    <div className="state-title">
                      <span>{index === 0 ? "Start" : `Krok ${index}`}</span>
                      {index > 0 && <strong>{moveLabel(result.moves[index - 1])}</strong>}
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
