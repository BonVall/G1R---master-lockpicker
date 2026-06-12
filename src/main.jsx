import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const MIN_TILES = 3;
const MAX_TILES = 7;
const MIN_POSITION = 1;
const MAX_POSITION = 7;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const makeDefaultMatrix = (size) =>
  Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row === col ? 1 : 0)),
  );

const normalizeState = (state, size) =>
  state
    .slice(0, size)
    .map((value) => clamp(Number(value) || MIN_POSITION, MIN_POSITION, MAX_POSITION));

const stateKey = (state) => state.join(",");

const applyMove = (state, matrix, moveIndex) =>
  state.map((value, tileIndex) => {
    const delta = matrix[moveIndex][tileIndex];
    const shifted =
      ((value - MIN_POSITION + delta) % MAX_POSITION + MAX_POSITION) % MAX_POSITION;
    return shifted + 1;
  });

const isSolved = (state) => state.every((value) => value === 1);

function solveLock(startState, matrix, size) {
  const start = normalizeState(startState, size);
  const startKey = stateKey(start);

  if (isSolved(start)) {
    return {
      status: "solved",
      moves: [],
      states: [start],
      visited: 1,
    };
  }

  const queue = [{ state: start, moves: [], states: [start] }];
  const visited = new Set([startKey]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];

    for (let moveIndex = 0; moveIndex < size; moveIndex += 1) {
      const nextState = applyMove(current.state, matrix, moveIndex);
      const key = stateKey(nextState);

      if (visited.has(key)) {
        continue;
      }

      const nextMoves = [...current.moves, moveIndex + 1];
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

  return {
    status: "unsolved",
    moves: [],
    states: [start],
    visited: visited.size,
  };
}

function formatExport(size, startState, matrix, result) {
  const lines = [
    "Gothic Lock Solver",
    `Liczba plytek: ${size}`,
    `Stan poczatkowy: ${startState.join(" ")}`,
    "",
    "Macierz zaleznosci:",
    ...matrix.map((row, index) => `Ruch ${index + 1}: ${row.map((value) => (value > 0 ? "+" : value < 0 ? "-" : "0")).join(" ")}`),
    "",
  ];

  if (result.status === "solved") {
    lines.push(`Najkrotsza sekwencja (${result.moves.length}): ${result.moves.length ? result.moves.join(" -> ") : "brak ruchow"}`);
    lines.push("");
    lines.push("Podglad stanow:");
    result.states.forEach((state, index) => {
      const prefix = index === 0 ? "Start" : `Po ruchu ${index} (${result.moves[index - 1]})`;
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
  const [tileCount, setTileCount] = useState(5);
  const [positions, setPositions] = useState([2, 3, 5, 1, 4]);
  const [matrix, setMatrix] = useState(makeDefaultMatrix(5));
  const [result, setResult] = useState(null);

  const normalizedPositions = useMemo(
    () => normalizeState(positions, tileCount),
    [positions, tileCount],
  );

  const resizePuzzle = (size) => {
    const nextSize = clamp(Number(size) || MIN_TILES, MIN_TILES, MAX_TILES);
    setTileCount(nextSize);
    setPositions((current) => {
      const resized = normalizeState(current, nextSize);
      while (resized.length < nextSize) {
        resized.push(1);
      }
      return resized;
    });
    setMatrix((current) =>
      Array.from({ length: nextSize }, (_, row) =>
        Array.from({ length: nextSize }, (_, col) => current[row]?.[col] ?? (row === col ? 1 : 0)),
      ),
    );
    setResult(null);
  };

  const updatePosition = (index, value) => {
    setPositions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? clamp(Number(value) || MIN_POSITION, MIN_POSITION, MAX_POSITION) : item,
      ),
    );
    setResult(null);
  };

  const updateMatrixCell = (row, col, value) => {
    setMatrix((current) =>
      current.map((matrixRow, rowIndex) =>
        rowIndex === row
          ? matrixRow.map((cell, colIndex) => (colIndex === col ? Number(value) : cell))
          : matrixRow,
      ),
    );
    setResult(null);
  };

  const resetExample = () => {
    setTileCount(5);
    setPositions([2, 3, 5, 1, 4]);
    setMatrix([
      [1, 0, 0, -1, 0],
      [0, 1, -1, 0, 0],
      [0, 0, 1, 1, -1],
      [-1, 0, 0, 1, 0],
      [0, 1, 0, 0, 1],
    ]);
    setResult(null);
  };

  const solve = () => {
    setResult(solveLock(normalizedPositions, matrix, tileCount));
  };

  const exportResult = () => {
    const activeResult = result ?? solveLock(normalizedPositions, matrix, tileCount);
    const text = formatExport(tileCount, normalizedPositions, matrix, activeResult);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gothic-lock-result.txt";
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
            <p className="eyebrow">Solver kombinacyjny</p>
            <h1>Gothic Lock Solver</h1>
          </div>
          <div className="actions">
            <button className="ghost-button" type="button" onClick={resetExample} title="Wczytaj przykład">
              <Icon>↺</Icon>
              Przykład
            </button>
            <button className="primary-button" type="button" onClick={solve}>
              <Icon>▶</Icon>
              Rozwiąż
            </button>
          </div>
        </header>

        <section className="control-band" aria-label="Ustawienia zamka">
          <label className="field">
            <span>Liczba płytek</span>
            <input
              type="number"
              min={MIN_TILES}
              max={MAX_TILES}
              value={tileCount}
              onChange={(event) => resizePuzzle(event.target.value)}
            />
          </label>

          <div className="positions" aria-label="Pozycje płytek">
            {Array.from({ length: tileCount }, (_, index) => (
              <label className="tile-input" key={index}>
                <span>{index + 1}</span>
                <input
                  type="number"
                  min="1"
                  max={MAX_POSITION}
                  value={normalizedPositions[index]}
                  onChange={(event) => updatePosition(index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="matrix-section" aria-label="Macierz zależności">
          <div className="section-heading">
            <div>
              <p className="eyebrow">-/0/+</p>
              <h2>Macierz zależności</h2>
            </div>
            <p>Wiersz oznacza naciśnięty ruch, kolumna płytkę, a wartość zmianę pozycji.</p>
          </div>

          <div className="matrix-wrap">
            <div className="matrix-grid" style={{ "--size": tileCount }}>
              <div className="corner-cell" />
              {Array.from({ length: tileCount }, (_, col) => (
                <div className="matrix-label" key={`col-${col}`}>P{col + 1}</div>
              ))}
              {matrix.map((row, rowIndex) => (
                <React.Fragment key={`row-${rowIndex}`}>
                  <div className="matrix-label">R{rowIndex + 1}</div>
                  {row.map((cell, colIndex) => (
                    <select
                      key={`${rowIndex}-${colIndex}`}
                      value={cell}
                      onChange={(event) => updateMatrixCell(rowIndex, colIndex, event.target.value)}
                      aria-label={`Ruch ${rowIndex + 1}, płytka ${colIndex + 1}`}
                    >
                      <option value="-1">-</option>
                      <option value="0">0</option>
                      <option value="1">+</option>
                    </select>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="result-band" aria-live="polite">
          <div className="result-heading">
            <div>
              <p className="eyebrow">BFS</p>
              <h2>Wynik</h2>
            </div>
            <button className="ghost-button" type="button" onClick={exportResult} title="Eksportuj wynik do tekstu">
              <Icon>⇩</Icon>
              Eksport
            </button>
          </div>

          {!result && (
            <div className="empty-state">
              Ustaw pozycje i zależności, a potem uruchom wyszukiwanie najkrótszej sekwencji.
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
                    ? "Zamek jest już rozwiązany."
                    : `Najkrótsza sekwencja: ${result.moves.join(" -> ")}`}
                </strong>
                <span>{result.moves.length} ruchów, {result.visited} odwiedzonych stanów</span>
              </div>

              <div className="timeline">
                {result.states.map((state, index) => (
                  <article className="state-card" key={`${index}-${stateKey(state)}`}>
                    <div className="state-title">
                      <span>{index === 0 ? "Start" : `Krok ${index}`}</span>
                      {index > 0 && <strong>Ruch {result.moves[index - 1]}</strong>}
                    </div>
                    <div className="state-row" style={{ "--tile-count": tileCount }}>
                      {state.map((value, tileIndex) => (
                        <span className={value === 1 ? "solved tile" : "tile"} key={tileIndex}>
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
