# Menedzer Budzetu - szczegolowa instrukcja obslugi

## 1. Cel modulu

Menedzer Budzetu sluzy do planowania i kontroli finansow osobistych w ukladzie okresowym (miesiecznym lub tygodniowym). Modul laczy:

1. Plan budzetowy (okres, waluta, cel przychodu).
2. Pule budzetowe (np. Jedzenie, Transport, Dom) z limitami i progami alertow.
3. Przychody (wplywy w ramach wybranego okresu).
4. Cele oszczednosciowe (manualne i automatyczne odkladanie srodkow).
5. Rollover okresu (zamkniecie okresu i utworzenie kolejnego).

W efekcie widzisz nie tylko "ile wydales", ale tez "czy miescisz sie w planie" i "jak szybko realizujesz cele".

---

## 2. Dostep i widok glowny

1. Zaloguj sie do aplikacji.
2. Przejdz do zakladki Budzety z gornego menu.
3. Otworzy sie strona Menedzer Budzetu.

Ekran sklada sie z:

1. Formularza tworzenia budzetu (u gory).
2. Zakladek roboczych:
   1. Okresy
   2. Przychody
   3. Pule
   4. Cele
3. Komunikatow sukcesu i bledow.

---

## 3. Szybki start (pierwsze 10 minut)

Jesli uruchamiasz modul pierwszy raz, wykonaj te kroki:

1. Utworz nowy budzet:
   1. Nazwa: np. "Maj 2026".
   2. Okres: Monthly (miesieczny) albo Weekly (tygodniowy).
   3. Data startu i konca.
   4. Waluta.
   5. Opcjonalnie cel przychodu.
   6. Kliknij Utworz budzet (szablon 50/30/20).
2. Przejdz do zakladki Przychody i dodaj co najmniej jeden przychod.
3. Przejdz do zakladki Pule i sprawdz, czy puli jest tyle, ile potrzebujesz.
4. Przejdz do zakladki Cele i utworz pierwszy cel oszczednosciowy.
5. Wroc do zakladki Okresy i uzyj Przelicz, aby odswiezyc stan.

Po tym masz gotowy, dzialajacy cykl budzetowy.

---

## 4. Tworzenie budzetu - krok po kroku

### 4.1 Pola formularza

1. Nazwa budzetu: dowolna nazwa okresu.
2. Okres:
   1. Monthly - miesieczny.
   2. Weekly - tygodniowy.
3. Start i End: zakres dat okresu.
4. Waluta: waluta budzetu.
5. Cel przychodu (opcjonalnie): wartosc referencyjna planu.

### 4.2 Co dzieje sie po kliknieciu "Utworz budzet"

1. Tworzony jest plan budzetu dla wskazanego okresu.
2. Automatycznie stosowany jest szablon 50/30/20.
3. Okres trafia na liste okresow i moze zostac od razu zaznaczony jako aktywny.

### 4.3 Najwazniejsze reguly walidacji

1. Data startu nie moze byc pozniejsza niz data konca.
2. Dla okresu tygodniowego zakres musi miec dokladnie 7 dni.
3. Dla okresu miesiecznego start musi byc 1. dniem miesiaca, a koniec ostatnim.
4. Okres nie moze nachodzic na inny aktywny budzet.
5. Cel przychodu, jesli podany, musi byc wiekszy od 0.

---

## 5. Zakladka "Okresy"

Zakladka sluzy do:

1. Wyboru aktywnego okresu z listy.
2. Odczytu statusu budzetu (aktywny / archiwalny).
3. Operacji systemowych na okresie.

### 5.1 Przyciski akcji

1. Przelicz:
   1. Reaguje na zmiany w przychodach, wydatkach i celach.
   2. Odswieza podsumowanie i wykorzystanie pul.
2. Auto-allocate goals:
   1. Uruchamia automatyczne zasilenie celow oszczednosciowych.
   2. Korzysta z ustawien celu (kwota auto alokacji i ewentualna pula zrodlowa).
3. Zamknij okres:
   1. Konczy biezacy okres.
   2. Tworzy kolejny okres zgodnie z logika rollover.
4. Run due rollovers (tylko admin):
   1. Uruchamia seryjne rollover dla okresow, ktore sa juz "due".

### 5.2 Kiedy uzywac "Zamknij okres"

Uzywaj po zakonczeniu okresu (np. po koncu miesiaca), kiedy chcesz:

1. Zamknac wyniki biezacego budzetu.
2. Przejsc do kolejnego okresu z zachowaniem logiki przeniesien.

---

## 6. Zakladka "Przychody"

Tu zarzadzasz wszystkimi przychodami w granicach wybranego okresu.

### 6.1 Dodawanie przychodu

1. Wpisz tytul (np. "Wynagrodzenie", "Premia").
2. Podaj kwote.
3. Wybierz date przychodu.
4. Kliknij Dodaj przychod.

### 6.2 Usuwanie przychodu

1. Znajdz wpis na liscie.
2. Kliknij Usun.
3. Stan budzetu zostanie przeliczony po odswiezeniu danych.

### 6.3 Dobra praktyka

Przychody dodawaj na biezaco (tego samego dnia), zamiast raz na koniec miesiaca. Zobaczysz bardziej realistyczny obraz wykorzystania pul i wolnych srodkow.

---

## 7. Zakladka "Pule"

Pule to limity kategorii wydatkow. Dzieki nim kontrolujesz budzet granularnie.

### 7.1 Dodawanie puli

1. Nazwa puli: np. "Jedzenie", "Transport", "Rachunki".
2. Kategoria: wybierz kategorie osobista.
3. Typ puli:
   1. Fixed amount - stala kwota.
   2. % of income - procent od przychodu.
4. Target:
   1. Dla fixed: kwota.
   2. Dla percent: wartosc procentowa.
5. Alert %: prog ostrzegawczy wykorzystania (np. 80).
6. Kliknij Dodaj pule.

### 7.2 Odczyt podsumowania pul

W podsumowaniu zobaczysz:

1. Income / Spent / Saved.
2. Polityke nadwydatkow (overspending policy).
3. Dla kazdej puli:
   1. Kwote wydana vs przydzielona.
   2. Pozostala kwote.
   3. Procent wykorzystania.
   4. Status:
      1. On track
      2. Warning
      3. Exceeded

### 7.3 Jak interpretowac statusy

1. On track: wykorzystanie bezpieczne.
2. Warning: zblizasz sie do limitu (wedlug Alert %).
3. Exceeded: przekroczony limit puli.

---

## 8. Zakladka "Cele"

Cele oszczednosciowe pozwalaja systematycznie odkaldac srodki na konkretny cel.

### 8.1 Tworzenie celu

1. Nazwa celu: np. "Fundusz awaryjny", "Wakacje".
2. Target amount: docelowa kwota.
3. Deadline (opcjonalnie): termin realizacji.
4. Source pool (opcjonalnie): pula, z ktorej system ma alokowac.
5. Auto allocate / period (opcjonalnie): automatyczna kwota odkladana na okres.
6. Kliknij Utworz cel.

### 8.2 Reczna alokacja na cel

1. Przy celu wpisz kwote w polu Allocate amount.
2. Kliknij Allocate.
3. Pasek postepu i kwota biezaca celu zostana zaktualizowane.

### 8.3 Automatyczna alokacja

1. Przejdz do zakladki Okresy.
2. Dla wybranego okresu kliknij Auto-allocate goals.
3. System zasili cele zgodnie z ustawieniami auto alokacji.

### 8.4 Edycja celu

1. Kliknij Edit przy danym celu.
2. Mozesz zmienic:
   1. Nazwe.
   2. Target.
   3. Deadline.
   4. Pula zrodlowa.
   5. Auto allocate / period.
   6. Status aktywny/nieaktywny.
3. Kliknij Save.

### 8.5 Aktywacja/dezaktywacja celu

1. Kliknij Activate lub Deactivate.
2. Celu nie musisz usuwac, jesli ma byc chwilowo wstrzymany.

### 8.6 Historia alokacji

1. Kliknij Show history.
2. Zobaczysz wpisy manualne i automatyczne (data, notatka, kwota).
3. Kliknij Hide history, aby zwinac panel.

### 8.7 Pokazywanie nieaktywnych celow

1. Uzyj Show inactive / Hide inactive.
2. Przydatne do archiwalnych celow i przegladu historii.

---

## 9. Typowe scenariusze zastosowania

### 9.1 Budzet miesieczny - osoba pracujaca

Cel: kontrola wydatkow i stale odkladanie na poduszke finansowa.

1. Utworz budzet "Maj 2026".
2. Dodaj przychod "Wynagrodzenie" 8500 PLN.
3. Dodaj/zweryfikuj pule:
   1. Jedzenie
   2. Transport
   3. Rachunki
   4. Lifestyle
4. Utworz cel "Fundusz awaryjny" 20000 PLN.
5. Ustaw Auto allocate / period na 800 PLN.
6. Raz w tygodniu kliknij Przelicz.
7. Na koniec miesiaca kliknij Zamknij okres.

### 9.2 Budzet tygodniowy - kontrola wydatkow biezacych

Cel: trzymanie kosztow codziennych "pod reka".

1. Utworz budzet Weekly na 7 dni.
2. Dodaj przychod tygodniowy.
3. Ustal pule fixed (np. jedzenie i transport).
4. Sprawdzaj statusy Warning/Exceeded codziennie.
5. Korekty wprowadzaj przez aktualizacje przychodow i pul.

### 9.3 Cel krotkoterminowy - zakup sprzetu

Cel: odlozyc 3000 PLN w 3 miesiace.

1. Utworz cel "Laptop" target 3000 PLN.
2. Ustaw deadline.
3. Ustaw auto alokacje 1000 PLN/okres.
4. Gdy wplynie premia - dorzuc recznie alokacje.
5. Monitoruj postep i historie alokacji.

---

## 10. Praktyczny przyklad liczbowy

Dane:

1. Przychod: 10000 PLN.
2. Pule:
   1. Jedzenie: 2000 PLN (fixed)
   2. Transport: 1000 PLN (fixed)
   3. Lifestyle: 15% przychodu
3. Cel: "Wakacje" 6000 PLN, auto alokacja 500 PLN/okres.

Interpretacja:

1. Lifestyle (15%) = 1500 PLN.
2. Lacznie przydzielone do pul: 4500 PLN.
3. Wydatki na jedzenie 1700 PLN daja 85% wykorzystania tej puli.
4. Przy alert 80% pula przejdzie w Warning.
5. Auto alokacja celu doda 500 PLN i zwiekszy postep celu.

---

## 11. Komunikaty i bledy - jak reagowac

Najczestsze przyczyny bledow:

1. Niepoprawny zakres dat (start > end).
2. Niezgodny okres tygodniowy (inny niz 7 dni).
3. Okres miesieczny nie zaczyna sie 1. dnia lub nie konczy ostatnim dniem.
4. Nakladanie sie okresow budzetu.
5. Kwoty <= 0 przy przychodach, pulach lub celach.
6. Zbyt wysoki procent puli lub suma procentow > 100.
7. Brak wystarczajacej kwoty w puli przy alokacji na cel.
8. Proba zamkniecia okresu przed jego koncem.

Szybka procedura diagnostyczna:

1. Sprawdz komunikat bledu pod naglowkiem strony.
2. Zweryfikuj dane formularza (zwlaszcza liczby i daty).
3. Upewnij sie, ze wybrany jest poprawny okres.
4. Kliknij Przelicz po zmianach.

---

## 12. Uprawnienia i role

1. Kazdy aktywny uzytkownik moze:
   1. Tworzyc i obslugiwac swoje budzety.
   2. Dodawac przychody i pule.
   3. Zarzadzac celami oszczednosciowymi.
2. Tylko admin widzi i moze uruchomic akcje Run due rollovers.

---

## 13. Dobre praktyki operacyjne

1. Utrzymuj jeden aktywny budzet na okres - unikasz chaosu i zdublowanych danych.
2. Dodawaj przychody od razu po ich otrzymaniu.
3. Ustal alert puli na 75-85% dla lepszej prewencji nadwydatkow.
4. Cele oszczednosciowe trzymaj aktywne tylko wtedy, gdy faktycznie je realizujesz.
5. Raz na tydzien wykonuj szybki przeglad:
   1. Przelicz
   2. Sprawdz statusy pul
   3. Ocen postep celow
6. Zamykaj okres po jego naturalnym zakonczeniu, nie w trakcie.

---

## 14. Checklista "koniec okresu"

1. Zweryfikuj, czy wszystkie przychody sa dodane.
2. Zweryfikuj kluczowe wydatki i statusy pul.
3. Uruchom Przelicz.
4. Jesli korzystasz z celow: uruchom Auto-allocate goals.
5. Zamknij okres.
6. Sprawdz, czy nowy okres zostal utworzony.

---

## 15. Zakres instrukcji i uwagi koncowe

Instrukcja opisuje aktualny sposob dzialania panelu Menedzer Budzetu dostepnego w aplikacji, zgodny z obecnym UI i logika backendu. W przypadku dalszego rozwoju modulu (np. nowe typy pul, nowe polityki alokacji, nowe raporty) zaleca sie aktualizacje tego dokumentu razem z wdrozeniem.
