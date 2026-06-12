# Gothic Lock Solver

Klientowa aplikacja React/Vite do rozwiązywania zamka z 3-7 płytkami.

## Uruchomienie

```bash
npm install
npm run dev
```

## Funkcje

- wybór liczby płytek od 3 do 7,
- edycja pozycji startowych w zakresie `1..N`,
- macierz zależności z wartościami `-`, `0`, `+`,
- BFS zwracający najkrótszą sekwencję ruchów,
- podgląd stanu po każdym kroku,
- eksport wyniku do pliku tekstowego.

Cała logika działa w przeglądarce, bez backendu.
