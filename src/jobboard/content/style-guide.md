# Huisstijl Nederlands — vacaturebord EA Nederland

Deze gids is de registerreferentie voor alle Nederlandse tekst op het bord (spec §9.5).
Hij wordt vóór elke generatie aan de prompt toegevoegd.

Distilleer deze gids opnieuw met `npm run mirror-glossary`, dat de bestaande
Nederlandse pagina's van effectiefaltruisme.nl inleest — de begrippenlijst
eerst, plus het introductiemateriaal, de loopbaangids en de artikelen over
geven en dierenwelzijn. Die tekst lost het probleem al op: het is Nederlands,
het gaat over deze ideeën, en het is geschreven door mensen die hebben besloten
hóe je deze dingen in deze taal zegt.

> Doe dit vóór je een pagina schrijft. Het is de stap met de grootste
> hefboom en hij is bijna volledig mechanisch.

---

## Aanspreekvorm

**"je", altijd.** Nooit "u", nooit wisselen binnen een pagina of tussen pagina's.
De organisatie is "we" of "EA Nederland". Nooit "wij van EA Nederland".

Dit is de enige regel in deze gids waar afwijken meteen opvalt. Eén "u" in een
verder consequent "je"-tekst leest als een kopieerfout.

## Toon

Rustig, geloofwaardig, menselijk. Je schrijft voor iemand die intelligent is,
sceptisch, en nog nooit van dit alles heeft gehoord — niet voor een leeg blad.

- Zeg wat je bedoelt, in de kortste vorm die nog klopt.
- Geen superlatieven. Geen uitroeptekens. Geen holle bijvoeglijke naamwoorden.
- Geen emoji. Nergens.
- Noem de onzekerheid als die er is. Dat is geen zwakte maar de reden dat iemand
  je gelooft.
- Neem het tegenargument op. Een pagina die één kant kiest bereikt het
  tegenovergestelde van wat hij moet doen.

## Verboden woorden

Deze drie komen er standaard uit een taalmodel en zijn precies het register dat
het bord moet vermijden:

- **impactvol**
- **betekenisvol**
- **het verschil maken**

Ook te vermijden: "een wereld van verschil", "onze missie", "gepassioneerd",
"dé plek waar", "unieke kans", "samen bouwen we aan".

## Zinsbouw

- Gemiddeld 12–18 woorden. Varieer: een korte zin na twee lange doet het werk.
- Actief boven passief. "De AP handhaaft het verbod", niet "het verbod wordt
  gehandhaafd door de AP".
- Eén gedachte per zin. Nederlandse tangconstructies (werkwoord ver van het
  subject) maken een zin onleesbaar — knip hem door.
- Vermijd "het feit dat". Bijna altijd is er een directer werkwoord.
- Geen naamwoordstijl: "besluiten" in plaats van "een besluit nemen".

## Anglicismen

Het gevaarlijkste patroon is niet een verkeerd woord maar een Engelse woordorde
met Nederlandse woorden erin. Dat leest als vertaald ook als elk woord klopt.

Genereer daarom **direct in het Nederlands**. Vertaal nooit naar het Nederlands.
Geef het model desnoods een Engelse briefing, maar laat het in het Nederlands
componeren.

Veelvoorkomend en fout:

| Fout | Goed |
|---|---|
| "maakt het mogelijk om te" | "zorgt dat je", "laat je" |
| "in termen van" | "wat betreft", of herformuleer |
| "een aantal van" | "een paar", "enkele" |
| "op een dagelijkse basis" | "dagelijks", "elke dag" |
| "gelokaliseerd in" | "in", "gevestigd in" |
| "adresseren" (een probleem) | "aanpakken" |
| "controleren" (= beheersen) | "beheersen", "in de hand houden" |
| "eventueel" (= uiteindelijk) | "uiteindelijk" |

"Eventueel" en "controleren" zijn valse vrienden: ze bestaan in het Nederlands,
maar betekenen iets anders dan hun Engelse dubbelganger.

## Vakjargon

Geen onuitgelegd jargon in publieke tekst. Niet "neglectedness", niet
"counterfactual impact", niet "x-risk", niet "prioritering van problemen" als
losse woordgroep, en "EA" nooit als bijvoeglijk naamwoord.

Heb je een begrip nodig? Leg het uit waar je het gebruikt, of link naar
[de begrippenlijst](https://effectiefaltruisme.nl/begrippenlijst). Link bij het
eerste gebruik van elk begrip dat daar staat.

De begrippenlijst is gezaghebbend voor de vorm van elk begrip, inclusief welke
termen in het Engels blijven. Zie `glossary.json`.

## Getallen en eenheden

- Bedragen: `€ 18,7 miljoen`, niet `€18.7M`. Komma als decimaalteken.
- Percentages: `27%`, geen spatie.
- Datums in lopende tekst: `1 juni 2026`.
- Grote getallen met een punt: `24.300`.

## Titels en knoppen

Zinskapitalisatie overal, ook in koppen en op knoppen: "Bekijk de vacature",
niet "Bekijk De Vacature". Knoppen zijn korte werkwoordzinnen.

## Acceptatietest

Lees de tekst hardop voor, of laat een Nederlandse text-to-speech het doen.
Is een zin niet in één keer op normale spreeksnelheid voor te lezen, dan is hij
fout. Dit maakt houterige tekst hoorbaar op een manier die stil lezen niet doet.
