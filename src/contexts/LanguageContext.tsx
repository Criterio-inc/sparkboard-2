import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'sv' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  sv: {
    // LANDING
    'app.title': 'Sparkboard',
    'app.description': 'Sparkboard är en interaktiv plattform för kreativa workshops med sticky-notes och AI-analys',
    'app.tagline': 'Samarbeta, brainstorma och skapa tillsammans',
    'landing.facilitator.title': 'Facilitator',
    'landing.facilitator.description': 'Skapa och hantera workshops. Bjud in deltagare och få insikter i realtid.',
    'landing.facilitator.button': 'Skapa Workshop',
    'landing.participant.title': 'Deltagare',
    'landing.participant.description': 'Gå med i en workshop med din unika kod och dela dina idéer.',
    'landing.participant.button': 'Gå med i Workshop',
    
    // FEATURES
    'landing.features.realtime.title': 'Samarbeta i realtid',
    'landing.features.realtime.description': 'Se alla bidrag direkt när de skapas',
    'landing.features.easy.title': 'Enkel åtkomst',
    'landing.features.easy.description': 'Gå med via 6-siffrig kod eller QR - inget konto krävs',
    'landing.features.responsive.title': 'Responsiv design',
    'landing.features.responsive.description': 'Fungerar perfekt på mobil och desktop',
    'landing.features.ai.title': 'AI-analys',
    'landing.features.ai.description': 'Sammanfattar idéer, hittar teman och ger rekommendationer automatiskt',
    
    // AUTH & NAVIGATION
    'auth.login': 'Logga in',
    'auth.signup': 'Skapa konto',
    'auth.logout': 'Logga ut',
    'auth.myaccount': 'Mitt konto',
    'auth.email': 'E-post',
    'auth.password': 'Lösenord',
    'auth.company': 'Företagsnamn',
    'auth.facilitatorPin': 'Facilitator PIN',
    'auth.createPin': 'Skapa PIN',
    'auth.enterPin': 'Ange din PIN-kod',
    'auth.rememberMe': 'Kom ihåg mig',
    'auth.forgotPin': 'Glömt PIN?',
    'auth.register': 'Registrera',
    'auth.backToLogin': 'Tillbaka till inloggning',
    'auth.resetPin': 'Återställ PIN',
    'auth.resetSuccess': 'PIN återställd! Du kan nu logga in med din nya PIN.',
    'auth.resetError': 'Företaget hittades inte',
    'auth.loginSuccess': 'Välkommen tillbaka!',
    'auth.loginError': 'Felaktig PIN-kod',
    'auth.registerSuccess': 'Konto skapat! Du är nu inloggad.',
    'auth.registerError': 'Företagsnamnet används redan',
    'auth.loginTitle': 'Logga in',
    'auth.loginDescription': 'Logga in på ditt konto för att hantera workshops',
    'auth.name': 'Namn',
    'auth.pin': 'PIN-kod',
    'auth.loginButton': 'Logga in',
    'auth.createAccount': 'Skapa konto',
    'auth.or': 'eller',
    'auth.registerTitle': 'Skapa konto',
    'auth.registerDescription': 'Skapa ett nytt facilitatorkonto',
    'auth.nameOptional': 'Namn (valfritt)',
    'auth.nameOptionalPlaceholder': 'Ditt namn',
    'auth.confirmPin': 'Bekräfta PIN',
    'auth.securityInfo': 'Lägg till en säkerhetsfråga för att kunna återställa din PIN (valfritt)',
    'auth.securityQuestion': 'Säkerhetsfråga',
    'auth.securityQuestionPlaceholder': 'T.ex. Vad heter din första husdjur?',
    'auth.securityAnswer': 'Svar',
    'auth.securityAnswerPlaceholder': 'Ditt svar',
    'auth.cancel': 'Avbryt',
    'auth.createAccountButton': 'Skapa konto',
    'auth.pinMismatch': 'PIN-koderna matchar inte',
    'auth.pinMismatchDesc': 'Kontrollera att du angett samma PIN-kod två gånger',
    'auth.welcome': 'Välkommen!',
    'auth.welcomeDesc': 'Ditt konto har skapats',
    'auth.registerFailed': 'Kunde inte skapa konto',
    'auth.accountLocked': 'Kontot är låst',
    'auth.accountLockedDesc': 'För många misslyckade inloggningsförsök. Försök igen senare.',
    'auth.nameRequired': 'Namn krävs',
    'auth.nameRequiredDesc': 'Ange ditt namn för att logga in',
    'auth.accountNotFound': 'Kontot hittades inte',
    'auth.accountNotFoundDesc': 'Det finns inget konto med det namnet',
    'auth.loggedIn': 'Inloggad',
    'auth.welcomeBack': 'Välkommen tillbaka!',
    'auth.incorrectPin': 'Felaktig PIN-kod',
    'auth.attemptsLeft': '{count} försök kvar',
    'auth.accountNowLocked': 'Kontot är nu låst på grund av för många misslyckade försök',
    'auth.noAccountSelected': 'Inget konto valt',
    'auth.pinReset': 'PIN återställd',
    'auth.pinResetDesc': 'Du kan nu logga in med din nya PIN',
    'auth.resetFailed': 'Återställning misslyckades',
    'auth.resetPinTitle': 'Återställ PIN',
    'auth.resetPinDescription': 'Svara på din säkerhetsfråga för att återställa din PIN',
    'auth.securityQuestionLabel': 'Din säkerhetsfråga',
    'auth.yourAnswer': 'Ditt svar',
    'auth.yourAnswerPlaceholder': 'Ange ditt svar',
    'auth.newPin': 'Ny PIN',
    'auth.confirmNewPin': 'Bekräfta ny PIN',
    'auth.resetButton': 'Återställ PIN',
    'auth.pinPlaceholder': '••••••',
    'auth.namePlaceholder': 'Ditt namn',
    'auth.lockedOut': 'Kontot är låst på grund av för många misslyckade inloggningsförsök. Vänta 15 minuter.',
    'auth.attemptsRemaining': '{count} inloggningsförsök kvar',
    
    // CREATE WORKSHOP
    'workshop.create': 'Skapa Workshop',
    'workshop.new': 'Ny Workshop',
    'workshop.title': 'Titel',
    'workshop.titlePlaceholder': 'Min Workshop',
    'workshop.description': 'Beskrivning',
    'workshop.descriptionPlaceholder': 'Beskriv din workshop...',
    'workshop.addBoard': 'Lägg till Board',
    'workshop.boardTitle': 'Board-titel',
    'workshop.addQuestion': 'Lägg till Fråga',
    'workshop.questionText': 'Frågetext',
    'workshop.timeLimit': 'Tidsgräns (minuter)',
    'workshop.saveDraft': 'Spara som utkast',
    'workshop.activate': 'Aktivera Workshop',
    'workshop.update': 'Uppdatera Workshop',
    'workshop.code': 'Workshop-kod',
    'workshop.shareCode': 'Dela denna kod med deltagarna',
    'workshop.copyCode': 'Kopiera kod',
    'workshop.downloadQR': 'Ladda ner QR-kod',
    'workshop.boards': 'Boards',
    'workshop.maxBoards': 'Max 10 boards',
    'workshop.dragToReorder': 'Dra för att ändra ordning',
    'workshop.fillTitle': 'Fyll i en titel',
    'workshop.addAtLeastOneBoard': 'Lägg till minst ett board',
    'workshop.allBoardsNeedTitles': 'Alla boards behöver titlar',
    'workshop.allBoardsNeedQuestions': 'Alla boards behöver minst en fråga',
    
    // BOARD
    'boardCard.label': 'Board {index}',
    'boardCard.title': 'Titel',
    'boardCard.titlePlaceholder': 'Min Fråga',
    'boardCard.timeLimit': 'Tidsgräns (minuter)',
    'boardCard.questions': 'Frågor ({current}/{max})',
    'boardCard.questionPlaceholder': 'Fråga {index}',
    'boardCard.addQuestion': 'Lägg till fråga',
    
    // JOIN WORKSHOP
    'join.title': 'Gå med i Workshop',
    'join.welcome': 'Välkommen',
    'join.enterCode': 'Ange din 6-siffriga workshop-kod och ditt namn',
    'join.code': 'Workshop-kod',
    'join.codePlaceholder': '123456',
    'join.name': 'Ditt namn',
    'join.namePlaceholder': 'Anna Andersson',
    'join.button': 'Gå med i Workshop',
    'join.scanQR': 'Scanna QR-kod',
    'join.cancel': 'Avbryt',
    'join.getCodeFrom': 'Få workshop-koden från din facilitator',
    'join.joining': 'Ansluter...',
    'join.invalidCode': 'Ogiltig workshop-kod',
    'join.enterName': 'Ange ditt namn',
    
    // WORKSHOP SESSION (PARTICIPANT)
    'session.workshop': 'Workshop',
    'session.timeRemaining': 'Tid kvar',
    'session.addNote': 'Lägg till anteckning',
    'session.yourNote': 'Din anteckning',
    'session.submit': 'Skicka',
    'session.notes': 'anteckningar',
    'session.noNotes': 'Inga anteckningar än',
    'session.waiting': 'Väntar på nästa board...',
    'session.currentBoard': 'Nuvarande board',
    
    // ADD NOTE
    'addNote.title': 'Lägg till anteckning',
    'addNote.description': 'Välj en fråga och skriv din anteckning',
    'addNote.selectQuestion': 'Välj fråga',
    'addNote.selectPlaceholder': 'Välj en fråga...',
    'addNote.noteContent': 'Anteckning',
    'addNote.notePlaceholder': 'Skriv din anteckning här...',
    'addNote.submit': 'Lägg till',
    'addNote.cancel': 'Avbryt',
    
    // NAVIGATION
    'nav.back': 'Tillbaka',
    'nav.login': 'Logga in',
    'nav.logout': 'Logga ut',
    'nav.myWorkshops': 'Mina Workshops',
    
    // FACILITATOR CONTROL
    'facilitator.control': 'Facilitator Control',
    'facilitator.workshop': 'Workshop',
    'control.title': 'Facilitator Control',
    'control.workshop': 'Workshop',
    'control.start': 'Start',
    'control.pause': 'Pausa',
    'control.resume': 'Fortsätt',
    'control.nextBoard': 'Next Board',
    'control.prevBoard': 'Previous Board',
    'control.aiAnalysis': 'AI Analysis',
    'control.exportPDF': 'Export PDF',
    'control.soundOn': 'Sound On',
    'control.soundOff': 'Sound Off',
    'control.hideControls': 'Dölj kontroller',
    'control.showControls': 'Visa kontroller',
    'control.hideParticipants': 'Dölj deltagare',
    'control.showParticipants': 'Visa deltagare',
    'facilitator.startTimer': 'Starta',
    'facilitator.pauseTimer': 'Pausa',
    'facilitator.nextBoard': 'Nästa Board',
    'facilitator.previousBoard': 'Föregående Board',
    'facilitator.aiAnalysis': 'AI-Analys',
    'facilitator.exportPDF': 'Exportera PDF',
    'facilitator.soundOn': 'Ljud På',
    'facilitator.soundOff': 'Ljud Av',
    'facilitator.participants': 'Deltagare',
    'facilitator.hideParticipants': 'Dölj deltagare',
    'facilitator.showParticipants': 'Visa deltagare',
    'facilitator.noParticipants': 'Inga deltagare ännu',
    'facilitator.board': 'Board',
    'facilitator.of': 'av',
    'facilitator.paused': 'Pausad',
    'facilitator.running': 'Körs',
    
    // PARTICIPANTS
    'participants.title': 'Deltagare ({count})',
    'participants.noParticipantsYet': 'Inga deltagare ännu',
    'participants.noParticipants': 'Inga deltagare ännu',
    'participants.deleteConfirm': 'Ta bort deltagare?',
    'participants.deleteConfirmDesc': 'Är du säker på att du vill ta bort {name}? Alla deras anteckningar kommer att raderas.',
    'participants.cancel': 'Avbryt',
    'participants.delete': 'Ta bort',
    
    // AI ANALYSIS
    'ai.title': 'AI-Analys: {boardTitle}',
    'ai.description': 'Analysera {count} anteckningar med AI',
    'ai.notesLabel': 'Anteckningar ({count})',
    'ai.customPrompt': 'Anpassad prompt',
    'ai.defaultPrompt': `Analysera dessa workshop-svar och identifiera de 5-8 viktigaste insikterna.

För varje insight:
- Formulera ett tydligt tema/huvudbudskap
- Ge konkreta exempel från svaren (referera med "Not X")
- Gruppera liknande idéer tillsammans
- Förklara varför detta är viktigt för organisationen

Avsluta med:
- 3-5 konkreta, actionable rekommendationer för nästa steg
- Eventuella mönster, motsättningar eller gap du ser i svaren

Struktur: Använd tydliga rubriker (##) och punktlistor för maximal läsbarhet.`,
    'ai.promptPlaceholder': 'Beskriv vad du vill att AI:n ska fokusera på...',
    'ai.analyzeButton': 'Analysera med AI',
    'ai.aiAnalysisLabel': 'AI-Analys',
    'ai.analyzingStatus': 'Analyserar anteckningar...',
    'ai.analyzingWait': 'Detta kan ta några sekunder',
    'ai.clickToStart': 'Klicka på "Analysera med AI" för att börja',
    'ai.analyze': 'Analysera med AI',
    'ai.analyzing': 'Analyserar...',
    'ai.prompt': 'Sammanfatta huvudteman och insikter från dessa workshop-svar',
    'ai.results': 'AI-Analys',
    'ai.close': 'Stäng',
    'ai.copy': 'Kopiera',
    'ai.error': 'Kunde inte analysera anteckningarna',
    'ai.noNotes': 'Inga anteckningar att analysera',
    'ai.previousAnalyses': 'Tidigare analyser',
    'ai.noPreviousAnalyses': 'Inga tidigare analyser',
    'ai.currentAnalysis': 'Aktuell analys',
    'ai.noAnalysisYet': 'Ingen analys gjord ännu',
    'ai.createdAt': 'Skapad',
    'ai.deleteAnalysis': 'Ta bort analys',
    'ai.noNotesAvailable': 'Inga anteckningar tillgängliga för detta board',
    'ai.customPromptActive': 'Anpassad prompt',
    'ai.resetToDefault': 'Återställ till standard',
    'ai.customized': 'Anpassad',
    'ai.analysisComplete': 'Analys klar!',
    'ai.analysisAvailable': 'AI-analysen är nu tillgänglig',
    'ai.analysisFailed': 'Kunde inte genomföra analysen. Försök igen.',
    'ai.analysisDeleted': 'Analys raderad',
    'ai.analysisDeletedDesc': 'Analysen har tagits bort',
    'ai.deleteFailed': 'Kunde inte radera analysen',
    'ai.copied': 'Kopierat!',
    'ai.copiedDesc': 'Analysen har kopierats till urklipp',
    'ai.copyFailed': 'Kunde inte kopiera. Försök igen.',
    'ai.success': 'Analys klar!',
    
    // BOARDS & NOTES  
    'board.title': 'Board',
    'board.of': 'av',
    'board.notes': 'notes',
    'board.noNotes': 'Inga notes än',
    'board.noNotesYet': 'Inga notes än',
    
    // DASHBOARD
    'dashboard.title': 'Mina Workshops',
    'dashboard.createNew': 'Skapa Ny Workshop',
    'dashboard.workshop': 'workshop',
    'dashboard.workshops': 'workshops',
    'dashboard.active': 'Aktiva',
    'dashboard.drafts': 'Utkast',
    'dashboard.archived': 'Arkiverade',
    'dashboard.createdAt': 'Skapad',
    'dashboard.participants': 'deltagare',
    'dashboard.boards': 'boards',
    'dashboard.edit': 'Redigera',
    'dashboard.delete': 'Ta bort',
    'dashboard.open': 'Öppna',
    'dashboard.noWorkshops': 'Inga workshops än',
    'dashboard.comeBack': 'Kom igång genom att skapa din första workshop',
    'dashboard.createWorkshop': 'Skapa Workshop',
    'dashboard.status.active': 'Aktiv',
    'dashboard.status.draft': 'Utkast',
    'dashboard.openWorkshop': 'Öppna Workshop',
    'dashboard.startFacilitating': 'Starta',
    
    // COMMON
    'common.save': 'Spara',
    'common.cancel': 'Avbryt',
    'common.delete': 'Ta bort',
    'common.edit': 'Redigera',
    'common.close': 'Stäng',
    'common.back': 'Tillbaka',
    'common.next': 'Nästa',
    'common.loading': 'Laddar...',
    'common.confirm': 'Bekräfta',
    'common.copied': 'Kopierat!',
    
    // ERRORS & MESSAGES
    'error.workshopNotFound': 'Workshop-koden hittades inte. Kontrollera att koden är korrekt och försök igen.',
    'error.invalidCode': 'Ogiltig kod',
    'error.fillAllFields': 'Fyll i alla fält',
    'error.workshopDraft': 'Denna workshop är inte aktiverad ännu',
    'success.workshopCreated': 'Workshop skapad!',
    'success.workshopUpdated': 'Workshop uppdaterad!',
    'success.noteSaved': 'Anteckning sparad!',
    
    // FOOTER
    'footer.privacy': 'Integritetspolicy',
    'footer.terms': 'Användarvillkor',
    'footer.cookies': 'Cookie-policy',
    'footer.contact': 'Kontakt',
    'footer.copyright': '© 2025 Sparkboard. Alla rättigheter förbehållna.',
    
    // NOT FOUND
    'notFound.title': 'Sidan hittades inte',
    'notFound.description': 'Sidan du letar efter finns inte.',
    'notFound.button': 'Tillbaka till startsidan',
    
    // CONTROL PANEL
    'control.importNotes': 'Importera',
    
    // IMPORT NOTES
    'import.title': 'Importera & Klustra Post-its',
    'import.description': 'Importera post-its från andra boards till "{boardTitle}"',
    'import.selectNotes': 'Välj notes',
    'import.defineCategories': 'Kategorier',
    'import.preview': 'Förhandsgranska',
    'import.noNotesAvailable': 'Inga notes tillgängliga från andra boards',
    'import.selectAll': 'Välj alla',
    'import.deselectAll': 'Avmarkera alla',
    'import.selectedCount': '{count} valda',
    'import.noNotesSelected': 'Inga notes valda',
    'import.selectNotesFirst': 'Välj minst en note att importera',
    'import.needCategories': 'Kategorier saknas',
    'import.addAtLeastTwoCategories': 'Lägg till minst två kategorier',
    'import.categoriesLabel': 'Definiera kategorier',
    'import.categoriesDescription': 'AI kommer sortera valda notes in i dessa kategorier',
    'import.categoryPlaceholder': 'Kategori {index}',
    'import.addCategory': 'Lägg till kategori',
    'import.contextLabel': 'Extra kontext (valfritt)',
    'import.contextDescription': 'Ge AI mer information om hur du vill att notes ska sorteras',
    'import.contextPlaceholder': 'T.ex. "Sortera efter genomförbarhet" eller "Fokusera på tekniska lösningar"',
    'import.clustering': 'Klustar...',
    'import.previewClustering': 'Förhandsgranska med AI',
    'import.clusteringComplete': 'Klustring klar!',
    'import.reviewResults': 'Granska resultatet och bekräfta importen',
    'import.clusteringFailed': 'Klustring misslyckades',
    'import.importing': 'Importerar...',
    'import.confirmImport': 'Bekräfta import',
    'import.importSuccess': 'Import klar!',
    'import.notesImported': '{count} notes har importerats',
    'import.importFailed': 'Import misslyckades',
    'import.editCategoriesHint': 'Du kan redigera kategorinamnen genom att klicka på dem',
    'import.categoryNamePlaceholder': 'Kategorinamn',
  },
  
  en: {
    // LANDING
    'app.title': 'Sparkboard',
    'app.description': 'Sparkboard is an interactive platform for creative workshops with sticky-notes and AI analysis',
    'app.tagline': 'Collaborate, brainstorm and create together',
    'landing.facilitator.title': 'Facilitator',
    'landing.facilitator.description': 'Create and manage workshops. Invite participants and get real-time insights.',
    'landing.facilitator.button': 'Create Workshop',
    'landing.participant.title': 'Participant',
    'landing.participant.description': 'Join a workshop with your unique code and share your ideas.',
    'landing.participant.button': 'Join Workshop',
    
    // FEATURES
    'landing.features.realtime.title': 'Collaborate in real-time',
    'landing.features.realtime.description': 'See all contributions instantly as they are created',
    'landing.features.easy.title': 'Easy access',
    'landing.features.easy.description': 'Join via 6-digit code or QR - no account needed',
    'landing.features.responsive.title': 'Responsive design',
    'landing.features.responsive.description': 'Works perfectly on mobile and desktop',
    'landing.features.ai.title': 'AI Analysis',
    'landing.features.ai.description': 'Summarizes ideas, finds themes and gives recommendations automatically',
    
    // AUTH & NAVIGATION
    'auth.login': 'Log in',
    'auth.signup': 'Sign up',
    'auth.logout': 'Log out',
    'auth.myaccount': 'My account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.company': 'Company name',
    'auth.facilitatorPin': 'Facilitator PIN',
    'auth.createPin': 'Create PIN',
    'auth.enterPin': 'Enter your PIN code',
    'auth.rememberMe': 'Remember me',
    'auth.forgotPin': 'Forgot PIN?',
    'auth.register': 'Register',
    'auth.backToLogin': 'Back to login',
    'auth.resetPin': 'Reset PIN',
    'auth.resetSuccess': 'PIN reset! You can now log in with your new PIN.',
    'auth.resetError': 'Company not found',
    'auth.loginSuccess': 'Welcome back!',
    'auth.loginError': 'Incorrect PIN code',
    'auth.registerSuccess': 'Account created! You are now logged in.',
    'auth.registerError': 'Company name already in use',
    'auth.loginTitle': 'Log in',
    'auth.loginDescription': 'Log in to your account to manage workshops',
    'auth.name': 'Name',
    'auth.pin': 'PIN code',
    'auth.loginButton': 'Log in',
    'auth.createAccount': 'Create account',
    'auth.or': 'or',
    'auth.registerTitle': 'Create account',
    'auth.registerDescription': 'Create a new facilitator account',
    'auth.nameOptional': 'Name (optional)',
    'auth.nameOptionalPlaceholder': 'Your name',
    'auth.confirmPin': 'Confirm PIN',
    'auth.securityInfo': 'Add a security question to recover your PIN (optional)',
    'auth.securityQuestion': 'Security question',
    'auth.securityQuestionPlaceholder': 'E.g. What is your first pet\'s name?',
    'auth.securityAnswer': 'Answer',
    'auth.securityAnswerPlaceholder': 'Your answer',
    'auth.cancel': 'Cancel',
    'auth.createAccountButton': 'Create account',
    'auth.pinMismatch': 'PINs do not match',
    'auth.pinMismatchDesc': 'Please make sure you entered the same PIN twice',
    'auth.welcome': 'Welcome!',
    'auth.welcomeDesc': 'Your account has been created',
    'auth.registerFailed': 'Could not create account',
    'auth.accountLocked': 'Account locked',
    'auth.accountLockedDesc': 'Too many failed login attempts. Please try again later.',
    'auth.nameRequired': 'Name required',
    'auth.nameRequiredDesc': 'Enter your name to log in',
    'auth.accountNotFound': 'Account not found',
    'auth.accountNotFoundDesc': 'There is no account with that name',
    'auth.loggedIn': 'Logged in',
    'auth.welcomeBack': 'Welcome back!',
    'auth.incorrectPin': 'Incorrect PIN code',
    'auth.attemptsLeft': '{count} attempts left',
    'auth.accountNowLocked': 'Account is now locked due to too many failed attempts',
    'auth.noAccountSelected': 'No account selected',
    'auth.pinReset': 'PIN reset',
    'auth.pinResetDesc': 'You can now log in with your new PIN',
    'auth.resetFailed': 'Reset failed',
    'auth.resetPinTitle': 'Reset PIN',
    'auth.resetPinDescription': 'Answer your security question to reset your PIN',
    'auth.securityQuestionLabel': 'Your security question',
    'auth.yourAnswer': 'Your answer',
    'auth.yourAnswerPlaceholder': 'Enter your answer',
    'auth.newPin': 'New PIN',
    'auth.confirmNewPin': 'Confirm new PIN',
    'auth.resetButton': 'Reset PIN',
    'auth.pinPlaceholder': '••••••',
    'auth.namePlaceholder': 'Your name',
    'auth.lockedOut': 'Account locked due to too many failed login attempts. Please wait 15 minutes.',
    'auth.attemptsRemaining': '{count} login attempts remaining',
    
    // CREATE WORKSHOP
    'workshop.create': 'Create Workshop',
    'workshop.new': 'New Workshop',
    'workshop.title': 'Title',
    'workshop.titlePlaceholder': 'My Workshop',
    'workshop.description': 'Description',
    'workshop.descriptionPlaceholder': 'Describe your workshop...',
    'workshop.addBoard': 'Add Board',
    'workshop.boardTitle': 'Board title',
    'workshop.addQuestion': 'Add Question',
    'workshop.questionText': 'Question text',
    'workshop.timeLimit': 'Time limit (minutes)',
    'workshop.saveDraft': 'Save as draft',
    'workshop.activate': 'Activate Workshop',
    'workshop.update': 'Update Workshop',
    'workshop.code': 'Workshop code',
    'workshop.shareCode': 'Share this code with participants',
    'workshop.copyCode': 'Copy code',
    'workshop.downloadQR': 'Download QR code',
    'workshop.boards': 'Boards',
    'workshop.maxBoards': 'Max 10 boards',
    'workshop.dragToReorder': 'Drag to reorder',
    'workshop.fillTitle': 'Fill in a title',
    'workshop.addAtLeastOneBoard': 'Add at least one board',
    'workshop.allBoardsNeedTitles': 'All boards need titles',
    'workshop.allBoardsNeedQuestions': 'All boards need at least one question',
    
    // BOARD
    'boardCard.label': 'Board {index}',
    'boardCard.title': 'Title',
    'boardCard.titlePlaceholder': 'My Question',
    'boardCard.timeLimit': 'Time limit (minutes)',
    'boardCard.questions': 'Questions ({current}/{max})',
    'boardCard.questionPlaceholder': 'Question {index}',
    'boardCard.addQuestion': 'Add question',
    
    // JOIN WORKSHOP
    'join.title': 'Join Workshop',
    'join.welcome': 'Welcome',
    'join.enterCode': 'Enter your 6-digit workshop code and your name',
    'join.code': 'Workshop code',
    'join.codePlaceholder': '123456',
    'join.name': 'Your name',
    'join.namePlaceholder': 'John Doe',
    'join.button': 'Join Workshop',
    'join.scanQR': 'Scan QR code',
    'join.cancel': 'Cancel',
    'join.getCodeFrom': 'Get the workshop code from your facilitator',
    'join.joining': 'Joining...',
    'join.invalidCode': 'Invalid workshop code',
    'join.enterName': 'Enter your name',
    
    // WORKSHOP SESSION (PARTICIPANT)
    'session.workshop': 'Workshop',
    'session.timeRemaining': 'Time remaining',
    'session.addNote': 'Add note',
    'session.yourNote': 'Your note',
    'session.submit': 'Submit',
    'session.notes': 'notes',
    'session.noNotes': 'No notes yet',
    'session.waiting': 'Waiting for next board...',
    'session.currentBoard': 'Current board',
    
    // ADD NOTE
    'addNote.title': 'Add note',
    'addNote.description': 'Select a question and write your note',
    'addNote.selectQuestion': 'Select question',
    'addNote.selectPlaceholder': 'Select a question...',
    'addNote.noteContent': 'Note',
    'addNote.notePlaceholder': 'Write your note here...',
    'addNote.submit': 'Add',
    'addNote.cancel': 'Cancel',
    
    // NAVIGATION
    'nav.back': 'Back',
    'nav.login': 'Log in',
    'nav.logout': 'Log out',
    'nav.myWorkshops': 'My Workshops',
    
    // FACILITATOR CONTROL
    'facilitator.control': 'Facilitator Control',
    'facilitator.workshop': 'Workshop',
    'control.title': 'Facilitator Control',
    'control.workshop': 'Workshop',
    'control.start': 'Start',
    'control.pause': 'Pause',
    'control.resume': 'Resume',
    'control.nextBoard': 'Next Board',
    'control.prevBoard': 'Previous Board',
    'control.aiAnalysis': 'AI Analysis',
    'control.exportPDF': 'Export PDF',
    'control.soundOn': 'Sound On',
    'control.soundOff': 'Sound Off',
    'control.hideControls': 'Hide controls',
    'control.showControls': 'Show controls',
    'control.hideParticipants': 'Hide participants',
    'control.showParticipants': 'Show participants',
    'facilitator.startTimer': 'Start',
    'facilitator.pauseTimer': 'Pause',
    'facilitator.nextBoard': 'Next Board',
    'facilitator.previousBoard': 'Previous Board',
    'facilitator.aiAnalysis': 'AI Analysis',
    'facilitator.exportPDF': 'Export PDF',
    'facilitator.soundOn': 'Sound On',
    'facilitator.soundOff': 'Sound Off',
    'facilitator.participants': 'Participants',
    'facilitator.hideParticipants': 'Hide participants',
    'facilitator.showParticipants': 'Show participants',
    'facilitator.noParticipants': 'No participants yet',
    'facilitator.board': 'Board',
    'facilitator.of': 'of',
    'facilitator.paused': 'Paused',
    'facilitator.running': 'Running',
    
    // PARTICIPANTS
    'participants.title': 'Participants ({count})',
    'participants.noParticipantsYet': 'No participants yet',
    'participants.noParticipants': 'No participants yet',
    'participants.deleteConfirm': 'Remove participant?',
    'participants.deleteConfirmDesc': 'Are you sure you want to remove {name}? All their notes will be deleted.',
    'participants.cancel': 'Cancel',
    'participants.delete': 'Delete',
    
    // AI ANALYSIS
    'ai.title': 'AI Analysis: {boardTitle}',
    'ai.description': 'Analyze {count} notes with AI',
    'ai.notesLabel': 'Notes ({count})',
    'ai.customPrompt': 'Custom prompt',
    'ai.defaultPrompt': `Analyze these workshop responses and identify the 5-8 most important insights.

For each insight:
- Formulate a clear theme/key message
- Provide concrete examples from responses (reference as "Note X")
- Group similar ideas together
- Explain why this matters for the organization

Conclude with:
- 3-5 concrete, actionable recommendations for next steps
- Any patterns, contradictions, or gaps you see in the responses

Structure: Use clear headings (##) and bullet points for maximum readability.`,
    'ai.promptPlaceholder': 'Describe what you want the AI to focus on...',
    'ai.analyzeButton': 'Analyze with AI',
    'ai.aiAnalysisLabel': 'AI Analysis',
    'ai.analyzingStatus': 'Analyzing notes...',
    'ai.analyzingWait': 'This may take a few seconds',
    'ai.clickToStart': 'Click "Analyze with AI" to start',
    'ai.analyze': 'Analyze with AI',
    'ai.analyzing': 'Analyzing...',
    'ai.prompt': 'Summarize main themes and insights from these workshop responses',
    'ai.results': 'AI Analysis',
    'ai.close': 'Close',
    'ai.copy': 'Copy',
    'ai.error': 'Could not analyze notes',
    'ai.noNotes': 'No notes to analyze',
    'ai.success': 'Analysis complete!',
    'ai.previousAnalyses': 'Previous analyses',
    'ai.noPreviousAnalyses': 'No previous analyses',
    'ai.currentAnalysis': 'Current analysis',
    'ai.noAnalysisYet': 'No analysis done yet',
    'ai.createdAt': 'Created',
    'ai.deleteAnalysis': 'Delete analysis',
    'ai.noNotesAvailable': 'No notes available for this board',
    'ai.customPromptActive': 'Custom prompt',
    'ai.resetToDefault': 'Reset to default',
    'ai.customized': 'Customized',
    'ai.analysisComplete': 'Analysis complete!',
    'ai.analysisAvailable': 'AI analysis is now available',
    'ai.analysisFailed': 'Could not complete the analysis. Please try again.',
    'ai.analysisDeleted': 'Analysis deleted',
    'ai.analysisDeletedDesc': 'The analysis has been removed',
    'ai.deleteFailed': 'Could not delete the analysis',
    'ai.copied': 'Copied!',
    'ai.copiedDesc': 'The analysis has been copied to clipboard',
    'ai.copyFailed': 'Could not copy. Please try again.',
    
    // BOARDS & NOTES
    'board.title': 'Board',
    'board.of': 'of',
    'board.notes': 'notes',
    'board.noNotes': 'No notes yet',
    'board.noNotesYet': 'No notes yet',
    
    // DASHBOARD
    'dashboard.title': 'My Workshops',
    'dashboard.createNew': 'Create New Workshop',
    'dashboard.workshop': 'workshop',
    'dashboard.workshops': 'workshops',
    'dashboard.active': 'Active',
    'dashboard.drafts': 'Drafts',
    'dashboard.archived': 'Archived',
    'dashboard.createdAt': 'Created',
    'dashboard.participants': 'participants',
    'dashboard.boards': 'boards',
    'dashboard.edit': 'Edit',
    'dashboard.delete': 'Delete',
    'dashboard.open': 'Open',
    'dashboard.noWorkshops': 'No workshops yet',
    'dashboard.comeBack': 'Get started by creating your first workshop',
    'dashboard.createWorkshop': 'Create Workshop',
    'dashboard.status.active': 'Active',
    'dashboard.status.draft': 'Draft',
    'dashboard.openWorkshop': 'Open Workshop',
    'dashboard.startFacilitating': 'Start',
    
    // COMMON
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm',
    'common.copied': 'Copied!',
    
    // ERRORS & MESSAGES
    'error.workshopNotFound': 'Workshop code not found. Check that the code is correct and try again.',
    'error.invalidCode': 'Invalid code',
    'error.fillAllFields': 'Fill in all fields',
    'error.workshopDraft': 'This workshop is not activated yet',
    'success.workshopCreated': 'Workshop created!',
    'success.workshopUpdated': 'Workshop updated!',
    'success.noteSaved': 'Note saved!',
    
    // FOOTER
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.cookies': 'Cookie Policy',
    'footer.contact': 'Contact',
    'footer.copyright': '© 2025 Sparkboard. All rights reserved.',
    
    // NOT FOUND
    'notFound.title': 'Page not found',
    'notFound.description': 'The page you are looking for does not exist.',
    'notFound.button': 'Back to home',
    
    // CONTROL PANEL
    'control.importNotes': 'Import',
    
    // IMPORT NOTES
    'import.title': 'Import & Cluster Post-its',
    'import.description': 'Import post-its from other boards to "{boardTitle}"',
    'import.selectNotes': 'Select notes',
    'import.defineCategories': 'Categories',
    'import.preview': 'Preview',
    'import.noNotesAvailable': 'No notes available from other boards',
    'import.selectAll': 'Select all',
    'import.deselectAll': 'Deselect all',
    'import.selectedCount': '{count} selected',
    'import.noNotesSelected': 'No notes selected',
    'import.selectNotesFirst': 'Select at least one note to import',
    'import.needCategories': 'Categories missing',
    'import.addAtLeastTwoCategories': 'Add at least two categories',
    'import.categoriesLabel': 'Define categories',
    'import.categoriesDescription': 'AI will sort selected notes into these categories',
    'import.categoryPlaceholder': 'Category {index}',
    'import.addCategory': 'Add category',
    'import.contextLabel': 'Extra context (optional)',
    'import.contextDescription': 'Give AI more information about how you want notes sorted',
    'import.contextPlaceholder': 'E.g. "Sort by feasibility" or "Focus on technical solutions"',
    'import.clustering': 'Clustering...',
    'import.previewClustering': 'Preview with AI',
    'import.clusteringComplete': 'Clustering complete!',
    'import.reviewResults': 'Review the result and confirm import',
    'import.clusteringFailed': 'Clustering failed',
    'import.importing': 'Importing...',
    'import.confirmImport': 'Confirm import',
    'import.importSuccess': 'Import complete!',
    'import.notesImported': '{count} notes have been imported',
    'import.importFailed': 'Import failed',
    'import.editCategoriesHint': 'You can edit category names by clicking on them',
    'import.categoryNamePlaceholder': 'Category name',
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('user_language') as Language;
    return stored || 'sv';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('user_language', lang);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    let translation = translations[language]?.[key] || key;
    
    // Replace parameters in the translation
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, value);
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
