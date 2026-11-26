# DELVERIA | 2D Sandbox RPG

Projekt gry 2D Sandbox RPG stworzony w Phaser 3, TypeScript i Tauri (Rust).

---

## 🎮 Jak uruchomić grę po pobraniu z GitHuba (Windows)

Nie musisz nic instalować ani mieć dostępu do internetu przy uruchamianiu:

1. **Aplikacja okienkowa (rekomendowane):** kliknij dwukrotnie **`Delveria.exe`** w głównym folderze gry (`WebView2Loader.dll` musi leżeć obok niego w tym samym folderze).
2. **W przeglądarce (bez Pythona i Node.js):** kliknij dwukrotnie **`Uruchom_w_przegladarce.bat`** — uruchomi wbudowany lokalny serwer Windows i automatycznie otworzy grę.

---

## 🚀 Uruchomienie lokalne (Localhost)

Gra nie wymaga skomplikowanego setupu ani kompilacji przed pierwszym uruchomieniem – skompilowany kod JavaScript (`js/`) oraz biblioteka Phaser (`lib/phaser.min.js`) znajdują się bezpośrednio w repozytorium.

### Sposób 1: Python (rekomendowany)
W katalogu głównym projektu uruchom:
```bash
python -m http.server 8080
```
Następnie otwórz w przeglądarce: [http://localhost:8080](http://localhost:8080)

### Sposób 2: npm / Node.js
```bash
npm run dev
```

---

## 🛠️ Praca ze źródłami TypeScript (opcjonalnie)

Jeśli edytujesz pliki `.ts` w katalogu `src/`:
1. Zainstaluj zależności deweloperskie:
   ```bash
   npm install
   ```
2. Skompiluj zmiany TypeScript do JavaScript:
   ```bash
   npm run build
   ```
   (lub włącz tryb nasłuchiwania: `npx tsc -w`)

---

## 👥 Współpraca przez Git i GitHub (Instrukcja dla zespołu)

### Klonowanie repozytorium (dla drugiego programisty)
```bash
git clone https://github.com/adamjung850/Eclipse-gra.git
cd Eclipse-gra
```

### 1. Pobieranie najnowszych zmian przed rozpoczęciem pracy
Zawsze przed rozpoczęciem pracy pobierz najnowszy stan repozytorium:
```bash
git pull origin main
```

### 2. Zapisywanie i wysyłanie własnych zmian
Po wykonaniu i przetestowaniu zmian:
```bash
git add .
git commit -m "Opis wykonanych zmian"
git push origin main
```

### 3. Co zrobić, gdy ktoś inny wysłał zmiany w międzyczasie?
Jeśli `git push` zostanie odrzucony, oznacza to, że na GitHubie są nowsze commity:
1. Pobierz zmiany kolegi:
   ```bash
   git pull origin main
   ```
2. Jeśli zmienialiście różne pliki lub różne linie – Git automatycznie scali zmiany (`Auto-merging`).
3. Jeśli wystąpi konflikt w tym samym pliku – Git wskaże plik z konfliktem. Otwórz go w Antigravity IDE, wybierz właściwą wersję, zapisz, a następnie:
   ```bash
   git add .
   git commit -m "Rozwiązanie konfliktu"
   git push origin main
   ```
