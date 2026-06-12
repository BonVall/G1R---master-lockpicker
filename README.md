# G1 Master Lockpicker

Klientowa aplikacja React/Vite do rozwiązywania zamka G1 z 3-7 zapadkami.

## Uruchomienie

```bash
npm install
npm run dev
```

## Publikacja na GitHub Pages

Projekt ma gotowy workflow `.github/workflows/deploy.yml`. Po wypchnięciu zmian na branch `main` GitHub Actions zbuduje aplikację i opublikuje ją w GitHub Pages.

W repozytorium na GitHub ustaw:

1. `Settings` -> `Pages`.
2. `Build and deployment` -> `Source`: `GitHub Actions`.
3. Wypchnij zmiany na `main`.

## Funkcje

- wybór liczby zapadek od 3 do 7,
- edycja oczka każdej zapadki w zakresie `1..7`,
- cel: wszystkie zapadki na oczku `4`,
- klikalne zależności `ten sam kierunek` i `przeciwny kierunek`,
- ruch każdej zapadki zawsze o dokładnie jedno oczko,
- automatyczne odwracanie zależności dla ruchu `A` i `D`,
- BFS sprawdzający ruch w lewo `A` i ruch w prawo `D` dla każdej zapadki,
- najkrótsza sekwencja w formacie `1D -> 4A -> 6D`,
- podgląd stanu po każdym kroku,
- eksport wyniku do pliku tekstowego.

Cała logika działa w przeglądarce, bez backendu.
