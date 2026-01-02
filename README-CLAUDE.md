# Hur du använder Claude Code med Sparkboard

> En steg-för-steg guide för att få maximal nytta av Claude Code - även om du inte är utvecklare!

## 🎯 Vad är detta?

Detta projekt har nu en komplett **Claude Code-konfiguration** som gör att AI-assistenten Claude:
- **Förstår** exakt hur Sparkboard fungerar
- **Följer** rätt säkerhetsmönster automatiskt
- **Hjälper dig** med vanliga uppgifter snabbare
- **Validerar** att allt fungerar korrekt

Tänk på det som ett "instruktionsbibliotek" för Claude som gör att du kan jobba smartare, inte hårdare.

## 🌟 Varför är detta värdefullt?

### Innan (utan denna setup):
❌ Du måste förklara Sparkboard's arkitektur varje gång
❌ Risk att Claude missar viktiga säkerhetsdetaljer
❌ Upprepande av samma instruktioner
❌ Osäkerhet om lösningar följer best practices

### Efter (med denna setup):
✅ Claude känner redan till Sparkboard's arkitektur
✅ Automatisk validering av säkerhet och subscription logic
✅ Färdiga kommandon för vanliga uppgifter
✅ Specialiserade AI-assistenter för olika uppgifter

## 📚 Vad ingår?

### 1. CLAUDE.md - "Sparkboard-handboken"
En komplett guide som berättar för Claude:
- Hur Sparkboard fungerar (React, Supabase, Edge Functions)
- Säkerhetsregler (hur Clerk + Supabase samarbetar)
- Subscription-nivåer (Free, Pro, Curago)
- Vanliga patterns och best practices

### 2. Slash Commands - Snabbkommandon
4 färdiga kommandon för vanliga uppgifter:
- `/workshop:new-edge-function` - Skapa nya API-endpoints
- `/workshop:add-migration` - Uppdatera databasen
- `/workshop:test-subscription-tier` - Testa olika prenumerationsnivåer
- `/workshop:add-ui-component` - Lägg till UI-komponenter

### 3. Subagents - Specialiserade AI-assistenter
3 experter som aktiveras automatiskt:
- **edge-function-creator** - Skapar säkra API-endpoints
- **type-safety-reviewer** - Granskar kod för fel
- **subscription-validator** - Kontrollerar prenumerationslogik

---

## 🚀 Kom igång: Steg-för-steg

### Steg 1: Öppna Sparkboard i Claude Code

**Vad du gör:**
```bash
cd /home/user/sparkboard2
claude code  # eller öppna projektet i din Claude Code-miljö
```

**Vad som händer:**
- Claude läser automatiskt CLAUDE.md
- Alla slash commands blir tillgängliga
- Subagents står redo att hjälpa till

### Steg 2: Använd Claude som vanligt

Du kan nu prata med Claude precis som vanligt, men Claude kommer nu att:
- **Förstå Sparkboard's struktur** utan att du behöver förklara
- **Följa säkerhetsmönster** automatiskt
- **Ge bättre förslag** baserat på projektets best practices

---

## 💡 Praktiska exempel

### Exempel 1: Lägga till en ny funktion

**Du säger:**
> "Jag vill lägga till möjlighet för användare att exportera workshop-data till PDF"

**Vad Claude gör automatiskt:**
1. ✅ Förstår att detta behöver en ny Edge Function
2. ✅ Aktiverar **edge-function-creator** subagent
3. ✅ Skapar funktionen med rätt säkerhet (Clerk JWT-verifiering)
4. ✅ Kontrollerar subscription-nivåer (kanske Pro-funktion?)
5. ✅ Lägger till frontend-integration
6. ✅ Ger testinstruktioner för Free/Pro/Curago

**Utan denna setup:** Du hade behövt förklara hur Edge Functions fungerar, säkerhetsmodellen, etc.

---

### Exempel 2: Fixa en bugg

**Du säger:**
> "Free-användare kan skapa fler än 1 workshop, fixa detta"

**Vad Claude gör automatiskt:**
1. ✅ Aktiverar **subscription-validator** subagent
2. ✅ Läser rätt Edge Function (`workshop-operations`)
3. ✅ Hittar felet i limit-kontrollen
4. ✅ Fixar med rätt pattern
5. ✅ Testar att Pro/Curago inte påverkas
6. ✅ Verifierar att felmeddelande är tydligt

**Utan denna setup:** Risk att fix:en missar edge cases eller bryter Pro-användare.

---

### Exempel 3: Lägg till ett UI-element

**Du säger:**
> "Lägg till en progress bar som visar hur många deltagare som är med"

**Du kan använda slash command:**
```
/workshop:add-ui-component
```

**Vad Claude gör:**
1. ✅ Frågar vilken komponent du behöver
2. ✅ Visar vilka shadcn/ui-komponenter som finns
3. ✅ Lägger till Progress-komponenten om den inte finns
4. ✅ Skapar exempel på hur du använder den
5. ✅ Säkerställer dark mode-stöd
6. ✅ Testar i olika skärmstorlekar

---

### Exempel 4: Testa en funktion

**Du säger:**
> "Jag har lagt till AI-analys, testa att det fungerar för alla prenumerationsnivåer"

**Du kan använda slash command:**
```
/workshop:test-subscription-tier
```

**Vad Claude gör:**
1. ✅ Skapar testplan för Free (ska blockeras)
2. ✅ Skapar testplan för Pro (ska fungera)
3. ✅ Skapar testplan för Curago (ska fungera)
4. ✅ Kontrollerar felmeddelanden
5. ✅ Verifierar tenant isolation (ingen kan se andras data)
6. ✅ Testar edge cases (vad händer vid subscription-ändring?)

---

### Exempel 5: Uppdatera databasen

**Du säger:**
> "Jag vill spara när en workshop senast öppnades"

**Du kan använda slash command:**
```
/workshop:add-migration
```

**Vad Claude gör:**
1. ✅ Frågar om detaljer (kolumnnamn, datatyp)
2. ✅ Skapar migration-fil med rätt timestamp
3. ✅ Lägger till `last_opened_at` kolumn
4. ✅ Skapar index för prestanda
5. ✅ Uppdaterar RLS-policies (säkerhet)
6. ✅ Instruerar hur du regenererar TypeScript-typer

---

## 🎓 Tips för bästa resultat

### Tip 1: Var specifik om vad du vill
**✅ Bra:** "Lägg till en knapp som låter facilitatorn exportera alla noter till Excel, men bara för Pro-användare"

**❌ Mindre bra:** "Gör något med export"

### Tip 2: Nämn subscription-nivåer om relevant
Claude vet nu om Free/Pro/Curago och kommer automatiskt att:
- Kolla limits för Free
- Aktivera features för Pro/Curago
- Visa upgrade-meddelanden

### Tip 3: Använd slash commands för vanliga uppgifter
De är snabbare och säkerställer rätt pattern:
- Skapa Edge Function? → `/workshop:new-edge-function`
- Databas-ändring? → `/workshop:add-migration`
- Testa subscription? → `/workshop:test-subscription-tier`
- Nytt UI? → `/workshop:add-ui-component`

### Tip 4: Lita på subagents
När Claude säger "Jag aktiverar [subagent]...", betyder det att en specialist tar över:
- **edge-function-creator**: Säker backend-kod
- **type-safety-reviewer**: Hittar type-fel
- **subscription-validator**: Validerar prenumerationslogik

### Tip 5: Fråga om förklaringar
Claude kan nu ge djupa förklaringar eftersom den förstår projektet:
- "Varför använder vi Edge Functions istället för direct Supabase queries?"
- "Hur fungerar Curago auto-detection?"
- "Varför behöver vi RLS policies om vi har Edge Functions?"

---

## 🔍 Vanliga scenarion

### Scenario: "Jag vill lägga till en ny funktion"

**Steg:**
1. Beskriv funktionen för Claude
2. Claude frågar om detaljer (vem ska kunna använda? subscription-krav?)
3. Claude skapar:
   - Backend (Edge Function med säkerhet)
   - Frontend (React-komponenter)
   - Databas-ändringar (om behövs)
4. Claude ger testplan
5. Du testar och bekräftar

**Exempel:**
> "Lägg till möjlighet att duplicera en workshop"

### Scenario: "Något fungerar inte"

**Steg:**
1. Beskriv problemet
2. Claude analyserar (aktiverar rätt subagent)
3. Claude hittar och fixar felet
4. Claude verifierar att fix:en inte bryter annat
5. Claude testar över subscription-nivåer

**Exempel:**
> "Pro-användare får felmeddelande när de försöker använda AI-analys"

### Scenario: "Jag behöver hjälp att förstå koden"

**Steg:**
1. Fråga Claude
2. Claude förklarar med kontext från Sparkboard
3. Claude visar exempel från projektet
4. Claude kan rita diagram eller visa flöden

**Exempel:**
> "Förklara hur authentication fungerar från frontend till databas"

### Scenario: "Jag vill refaktorera något"

**Steg:**
1. Beskriv vad du vill förbättra
2. Claude analyserar nuvarande lösning
3. Claude föreslår förbättringar (följer Sparkboard-patterns)
4. Claude implementerar
5. Claude verifierar med type-safety-reviewer

**Exempel:**
> "Workshopskjema-komponenten har blivit för stor, dela upp den"

---

## 📖 Cheat Sheet

### Slash Commands

| Kommando | När du använder det | Exempel |
|----------|---------------------|---------|
| `/workshop:new-edge-function` | Skapa ny backend-funktion | "Skapa endpoint för att ta bort deltagare" |
| `/workshop:add-migration` | Ändra databas-struktur | "Lägg till kolumn för workshop-färg" |
| `/workshop:test-subscription-tier` | Testa subscription-logik | "Testa att AI-funktioner blockeras för Free" |
| `/workshop:add-ui-component` | Lägg till UI-element | "Lägg till tooltip-komponent" |

### Subagents (aktiveras automatiskt)

| Subagent | Vad den gör | När den aktiveras |
|----------|-------------|-------------------|
| **edge-function-creator** | Skapar säkra API-endpoints | När du pratar om nya funktioner/endpoints |
| **type-safety-reviewer** | Granskar TypeScript-kod | När du ber om code review |
| **subscription-validator** | Validerar prenumerationslogik | När du pratar om Free/Pro/Curago |

---

## ❓ Vanliga frågor

### Vad är en "Edge Function"?
Tänk på det som en säker backdörr till databasen. Istället för att frontend pratar direkt med databasen (osäkert), går allt via Edge Functions som verifierar att användaren har rätt behörighet.

### Varför är subscription-validering viktig?
För att säkerställa att:
- Free-användare inte kan fuska och få Pro-funktioner
- Vi inte förlorar intäkter
- Användare får tydliga meddelanden om vad de behöver uppgradera för

### Vad är RLS (Row Level Security)?
Säkerhetsregler i databasen som säger "du kan bara se dina egna rader". I Sparkboard är RLS backup - primär säkerhet är Edge Functions.

### Varför TypeScript?
TypeScript fångar fel innan koden körs. Type-safety-reviewer hjälper till att hitta potentiella buggar tidigt.

### Hur påverkar detta prestanda?
Inte alls negativt! Setupen hjälper Claude att arbeta *snabbare* genom att:
- Undvika att ställa upprepande frågor
- Ge rätt lösning första gången
- Automatiskt validera koden

---

## 🎯 Nästa steg

Nu när du förstår hur det fungerar:

1. **Testa ett slash command** - Prova `/workshop:add-ui-component`
2. **Beskriv en funktion** du vill lägga till - Låt Claude guida dig
3. **Ställ en djup fråga** - "Hur fungerar säkerhetsmodellen?"
4. **Experimentera** - Claude kommer nu ge mycket bättre svar!

---

## 🆘 Behöver du hjälp?

Om något är oklart, fråga bara Claude:
- "Förklara hur jag använder slash commands"
- "Vad gör subscription-validator subagenten?"
- "Ge mig ett exempel på när edge-function-creator används"

Claude förstår nu Sparkboard och kan ge detaljerade förklaringar!

---

## 📝 Tekniska detaljer (för nyfikna)

<details>
<summary>Klicka för att se tekniska detaljer</summary>

### Filer som skapades

```
sparkboard2/
├── CLAUDE.md                          # Huvudguide (530+ rader)
└── .claude/
    ├── commands/
    │   ├── new-edge-function.md       # Edge Function template
    │   ├── add-migration.md           # Migration patterns
    │   ├── test-subscription-tier.md  # Test plans
    │   └── add-ui-component.md        # UI komponent guide
    └── agents/
        ├── edge-function-creator.md   # Backend expert
        ├── type-safety-reviewer.md    # TypeScript expert
        └── subscription-validator.md  # Subscription expert
```

### Hur det fungerar tekniskt

1. **CLAUDE.md läses automatiskt** när Claude Code öppnar projektet
2. **Slash commands** expanderar till detaljerade instruktioner
3. **Subagents** aktiveras via keyword-matching i conversation
4. **Alla delar refererar** till Sparkboard's specifika arkitektur

### Statistik

- **Totalt antal rader**: ~3000
- **Antal instruktioner**: 100+
- **Antal kodexempel**: 50+
- **Antal best practices**: 30+

</details>

---

**Lycka till med Sparkboard-utvecklingen! 🚀**

*Har du frågor? Fråga Claude - den förstår nu Sparkboard lika bra som du!*
