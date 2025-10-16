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
    'app.title': 'Idélabbet',
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
    
    // FACILITATOR CONTROL
    'facilitator.control': 'Facilitator Control',
    'facilitator.workshop': 'Workshop',
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
    'participants.noParticipants': 'Inga deltagare ännu',
    'participants.deleteConfirm': 'Ta bort deltagare?',
    'participants.deleteConfirmDesc': 'Är du säker på att du vill ta bort {name}? Alla deras anteckningar kommer att raderas.',
    'participants.cancel': 'Avbryt',
    'participants.delete': 'Ta bort',
    
    // AI ANALYSIS
    'ai.analyze': 'Analysera med AI',
    'ai.analyzing': 'Analyserar...',
    'ai.prompt': 'Sammanfatta huvudteman och insikter från dessa workshop-svar',
    'ai.results': 'AI-Analys',
    'ai.close': 'Stäng',
    'ai.copy': 'Kopiera',
    'ai.error': 'Kunde inte analysera anteckningarna',
    'ai.noNotes': 'Inga anteckningar att analysera',
    'ai.success': 'Analys klar!',
    'ai.copied': 'Kopierat till urklipp',
    
    // DASHBOARD
    'dashboard.title': 'Mina Workshops',
    'dashboard.createNew': 'Skapa Ny Workshop',
    'dashboard.active': 'Aktiva',
    'dashboard.drafts': 'Utkast',
    'dashboard.archived': 'Arkiverade',
    'dashboard.createdAt': 'Skapad',
    'dashboard.participants': 'deltagare',
    'dashboard.boards': 'boards',
    'dashboard.edit': 'Redigera',
    'dashboard.delete': 'Ta bort',
    'dashboard.open': 'Öppna',
    'dashboard.noWorkshops': 'Inga workshops ännu',
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
    'footer.copyright': '© 2025 Idélabbet. Alla rättigheter förbehållna.',
    
    // NOT FOUND
    'notFound.title': 'Sidan hittades inte',
    'notFound.description': 'Sidan du letar efter finns inte.',
    'notFound.button': 'Tillbaka till startsidan',
  },
  
  en: {
    // LANDING
    'app.title': 'Idélabbet',
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
    
    // FACILITATOR CONTROL
    'facilitator.control': 'Facilitator Control',
    'facilitator.workshop': 'Workshop',
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
    'participants.noParticipants': 'No participants yet',
    'participants.deleteConfirm': 'Remove participant?',
    'participants.deleteConfirmDesc': 'Are you sure you want to remove {name}? All their notes will be deleted.',
    'participants.cancel': 'Cancel',
    'participants.delete': 'Delete',
    
    // AI ANALYSIS
    'ai.analyze': 'Analyze with AI',
    'ai.analyzing': 'Analyzing...',
    'ai.prompt': 'Summarize main themes and insights from these workshop responses',
    'ai.results': 'AI Analysis',
    'ai.close': 'Close',
    'ai.copy': 'Copy',
    'ai.error': 'Could not analyze notes',
    'ai.noNotes': 'No notes to analyze',
    'ai.success': 'Analysis complete!',
    'ai.copied': 'Copied to clipboard',
    
    // DASHBOARD
    'dashboard.title': 'My Workshops',
    'dashboard.createNew': 'Create New Workshop',
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
    'footer.copyright': '© 2025 Idélabbet. All rights reserved.',
    
    // NOT FOUND
    'notFound.title': 'Page not found',
    'notFound.description': 'The page you are looking for does not exist.',
    'notFound.button': 'Back to home',
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
