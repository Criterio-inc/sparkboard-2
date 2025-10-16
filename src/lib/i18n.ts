import { useState } from 'react';

export type Language = 'sv' | 'en';

export const translations: Record<Language, Record<string, string>> = {
  sv: {
    // LANDING PAGE
    'app.title': 'Idélabbet',
    'app.tagline': 'Collaborate, brainstorm and create together',
    'landing.facilitator.title': 'Facilitator',
    'landing.facilitator.description': 'Skapa och hantera workshops med flera boards och frågor',
    'landing.facilitator.button': 'Skapa Workshop',
    'landing.participant.title': 'Deltagare',
    'landing.participant.description': 'Gå med i en workshop med en kod och dela dina idéer',
    'landing.participant.button': 'Gå med i Workshop',
    
    // FEATURES
    'landing.features.title': 'Nyckel funktioner',
    'landing.features.realtime.title': 'Interaktiva Boards',
    'landing.features.realtime.description': 'Skapa flera boards med olika teman och tidsgränser',
    'landing.features.easy.title': 'Realtidssamarbete',
    'landing.features.easy.description': 'Delta tillsammans och se idéer växa i realtid',
    'landing.features.responsive.title': 'AI-Analys',
    'landing.features.responsive.description': 'Få AI-drivna insikter och sammanfattningar av workshop-resultat',
    'landing.features.ai.title': 'Enkelt att Dela',
    'landing.features.ai.description': 'Generera QR-koder och delningslänkar för enkel åtkomst',
    
    // DASHBOARD
    'dashboard.title': 'Mina Workshops',
    'dashboard.createNew': 'Skapa Ny Workshop',
    'dashboard.manage': 'Hantera',
    'dashboard.edit': 'Redigera',
    'dashboard.delete': 'Ta bort',
    'dashboard.noWorkshops': 'Inga workshops än',
    'dashboard.noWorkshopsDesc': 'Skapa din första workshop för att komma igång',
    'dashboard.activeWorkshops': 'Aktiva Workshops',
    'dashboard.draftWorkshops': 'Utkast',
    'dashboard.logout': 'Logga ut',
    
    // CREATE WORKSHOP
    'createWorkshop.backToDashboard': 'Tillbaka till Dashboard',
    'createWorkshop.title': 'Workshop-titel',
    'createWorkshop.titlePlaceholder': 'T.ex. Innovation Workshop 2024',
    'createWorkshop.description': 'Beskrivning',
    'createWorkshop.descPlaceholder': 'Beskriv din workshop...',
    'createWorkshop.boards': 'Boards',
    'createWorkshop.addBoard': 'Lägg till Board',
    'createWorkshop.saveDraft': 'Spara Utkast',
    'createWorkshop.activateWorkshop': 'Aktivera Workshop',
    'createWorkshop.downloadQR': 'Ladda ner QR-kod',
    'createWorkshop.editWarning': 'Denna workshop har redan deltagarsvar',
    'createWorkshop.editWarningDesc': 'Ändringar kan påverka befintliga svar och anteckningar',
    'createWorkshop.workshopCode': 'Workshop-kod',
    'createWorkshop.joinAt': 'Gå med på',
    'createWorkshop.scanQR': 'Eller skanna QR-koden',
    'createWorkshop.continueManaging': 'Fortsätt hantera',
    
    // JOIN WORKSHOP
    'join.title': 'Gå med i Workshop',
    'join.enterCode': 'Ange Workshop-kod',
    'join.codePlaceholder': '6-ställig kod',
    'join.yourName': 'Ditt namn',
    'join.namePlaceholder': 'T.ex. Anna Andersson',
    'join.joinButton': 'Gå med i Workshop',
    
    // BOARD VIEW
    'boardView.participants': 'deltagare',
    'boardView.addNote': 'Lägg till Note',
    
    // ADD NOTE
    'addNote.title': 'Lägg till Note',
    'addNote.description': 'Välj en fråga och skriv din idé',
    'addNote.selectQuestion': 'Välj fråga',
    'addNote.selectPlaceholder': 'Välj en fråga...',
    'addNote.noteContent': 'Din idé',
    'addNote.notePlaceholder': 'Skriv din idé här...',
    'addNote.cancel': 'Avbryt',
    'addNote.submit': 'Skicka',
    
    // FACILITATOR CONTROL
    'facilitator.control': 'Facilitator Control',
    'facilitator.backToDashboard': 'Tillbaka till Dashboard',
    'facilitator.overview': 'Översikt',
    'facilitator.byQuestion': 'Per Fråga',
    'facilitator.controlPanel': 'Kontrollpanel',
    'facilitator.participants': 'Deltagare',
    'facilitator.hidePanel': 'Dölj panel',
    'facilitator.showPanel': 'Visa panel',
    
    // CONTROL PANEL
    'control.start': 'Starta',
    'control.pause': 'Pausa',
    'control.nextBoard': 'Nästa Board',
    'control.aiAnalysis': 'AI-Analys',
    'control.exportPDF': 'Export PDF',
    'control.soundOn': 'Ljud På',
    'control.soundOff': 'Ljud Av',
    
    // PARTICIPANTS
    'participants.title': 'Deltagare ({count})',
    'participants.noParticipants': 'Inga deltagare än',
    'participants.deleteConfirm': 'Ta bort deltagare?',
    'participants.deleteConfirmDesc': 'Är du säker på att du vill ta bort {name} från workshopen? Detta kan inte ångras.',
    'participants.cancel': 'Avbryt',
    'participants.delete': 'Ta bort',
    
    // BOARD CARD
    'boardCard.label': 'Board {index}',
    'boardCard.title': 'Board-titel',
    'boardCard.titlePlaceholder': 'T.ex. Brev från framtiden',
    'boardCard.timeLimit': 'Tidsgräns (minuter)',
    'boardCard.questions': 'Frågor ({current}/{max})',
    'boardCard.questionPlaceholder': 'Fråga {index}',
    'boardCard.addQuestion': 'Lägg till fråga',
    
    // AI ANALYSIS
    'ai.title': 'AI-Analys: {boardTitle}',
    'ai.description': 'Analysera {count} notes med AI för att hitta teman och insights',
    'ai.notesLabel': 'Workshop Notes ({count})',
    'ai.customPrompt': 'Anpassad Prompt (valfritt)',
    'ai.promptPlaceholder': 'Beskriv hur AI ska analysera notes...',
    'ai.analyzeButton': 'Analysera med AI',
    'ai.analyzing': 'Analyserar...',
    'ai.aiAnalysisLabel': 'AI-Analys',
    'ai.copy': 'Kopiera',
    'ai.analyzingStatus': 'AI analyserar dina workshop-notes...',
    'ai.analyzingWait': 'Detta kan ta några sekunder',
    'ai.clickToStart': 'Klicka på "Analysera med AI" för att starta',
    
    // AUTH
    'auth.loginTitle': 'Facilitator Inloggning',
    'auth.loginDescription': 'Logga in med ditt namn och PIN-kod',
    'auth.name': 'Namn',
    'auth.namePlaceholder': 'Ditt namn',
    'auth.pin': 'PIN-kod (4-6 siffror)',
    'auth.pinPlaceholder': '••••',
    'auth.loginButton': 'Logga in',
    'auth.or': 'Eller',
    'auth.createAccount': 'Skapa nytt konto',
    'auth.registerTitle': 'Skapa Facilitator-konto',
    'auth.registerDescription': 'Fyll i dina uppgifter för att komma igång',
    'auth.nameOptional': 'Namn / Företag (valfritt)',
    'auth.nameOptionalPlaceholder': 'T.ex. Anna Andersson',
    'auth.createPin': 'Skapa PIN-kod (4-6 siffror) *',
    'auth.confirmPin': 'Bekräfta PIN-kod *',
    'auth.securityInfo': 'Säkerhetsfråga (valfritt, för att återställa PIN)',
    'auth.securityQuestion': 'Fråga',
    'auth.securityQuestionPlaceholder': 'T.ex. Vad heter ditt första husdjur?',
    'auth.securityAnswer': 'Svar',
    'auth.securityAnswerPlaceholder': 'Ditt svar',
    'auth.cancel': 'Avbryt',
    'auth.createAccountButton': 'Skapa konto',
    'auth.resetPinTitle': 'Återställ PIN-kod',
    'auth.resetPinDescription': 'Svara på säkerhetsfrågan för att skapa en ny PIN',
    'auth.securityQuestionLabel': 'Säkerhetsfråga',
    'auth.yourAnswer': 'Ditt svar',
    'auth.yourAnswerPlaceholder': 'Ange ditt svar',
    'auth.newPin': 'Ny PIN-kod (4-6 siffror)',
    'auth.confirmNewPin': 'Bekräfta ny PIN-kod',
    'auth.resetButton': 'Återställ PIN',
    
    // COMMON
    'common.save': 'Spara',
    'common.cancel': 'Avbryt',
    'common.delete': 'Ta bort',
    'common.edit': 'Redigera',
    'common.close': 'Stäng',
    'common.loading': 'Laddar...',
    
    // NOT FOUND
    'notFound.message': 'Sidan kunde inte hittas',
    'notFound.home': 'Gå till startsidan',
  },
  
  en: {
    // LANDING PAGE
    'app.title': 'Idélabbet',
    'app.tagline': 'Collaborate, brainstorm and create together',
    'landing.facilitator.title': 'Facilitator',
    'landing.facilitator.description': 'Create and manage workshops with multiple boards and questions',
    'landing.facilitator.button': 'Create Workshop',
    'landing.participant.title': 'Participant',
    'landing.participant.description': 'Join a workshop with a code and share your ideas',
    'landing.participant.button': 'Join Workshop',
    
    // FEATURES
    'landing.features.title': 'Key Features',
    'landing.features.realtime.title': 'Interactive Boards',
    'landing.features.realtime.description': 'Create multiple boards with different themes and time limits',
    'landing.features.easy.title': 'Real-time Collaboration',
    'landing.features.easy.description': 'Participate together and see ideas grow in real-time',
    'landing.features.responsive.title': 'AI Analysis',
    'landing.features.responsive.description': 'Get AI-powered insights and summaries of workshop results',
    'landing.features.ai.title': 'Easy Sharing',
    'landing.features.ai.description': 'Generate QR codes and sharing links for easy access',
    
    // DASHBOARD
    'dashboard.title': 'My Workshops',
    'dashboard.createNew': 'Create New Workshop',
    'dashboard.manage': 'Manage',
    'dashboard.edit': 'Edit',
    'dashboard.delete': 'Delete',
    'dashboard.noWorkshops': 'No workshops yet',
    'dashboard.noWorkshopsDesc': 'Create your first workshop to get started',
    'dashboard.activeWorkshops': 'Active Workshops',
    'dashboard.draftWorkshops': 'Drafts',
    'dashboard.logout': 'Logout',
    
    // CREATE WORKSHOP
    'createWorkshop.backToDashboard': 'Back to Dashboard',
    'createWorkshop.title': 'Workshop Title',
    'createWorkshop.titlePlaceholder': 'E.g. Innovation Workshop 2024',
    'createWorkshop.description': 'Description',
    'createWorkshop.descPlaceholder': 'Describe your workshop...',
    'createWorkshop.boards': 'Boards',
    'createWorkshop.addBoard': 'Add Board',
    'createWorkshop.saveDraft': 'Save Draft',
    'createWorkshop.activateWorkshop': 'Activate Workshop',
    'createWorkshop.downloadQR': 'Download QR Code',
    'createWorkshop.editWarning': 'This workshop already has participant responses',
    'createWorkshop.editWarningDesc': 'Changes may affect existing responses and notes',
    'createWorkshop.workshopCode': 'Workshop Code',
    'createWorkshop.joinAt': 'Join at',
    'createWorkshop.scanQR': 'Or scan the QR code',
    'createWorkshop.continueManaging': 'Continue managing',
    
    // JOIN WORKSHOP
    'join.title': 'Join Workshop',
    'join.enterCode': 'Enter Workshop Code',
    'join.codePlaceholder': '6-digit code',
    'join.yourName': 'Your Name',
    'join.namePlaceholder': 'E.g. Anna Andersson',
    'join.joinButton': 'Join Workshop',
    
    // BOARD VIEW
    'boardView.participants': 'participants',
    'boardView.addNote': 'Add Note',
    
    // ADD NOTE
    'addNote.title': 'Add Note',
    'addNote.description': 'Select a question and write your idea',
    'addNote.selectQuestion': 'Select Question',
    'addNote.selectPlaceholder': 'Select a question...',
    'addNote.noteContent': 'Your Idea',
    'addNote.notePlaceholder': 'Write your idea here...',
    'addNote.cancel': 'Cancel',
    'addNote.submit': 'Submit',
    
    // FACILITATOR CONTROL
    'facilitator.control': 'Facilitator Control',
    'facilitator.backToDashboard': 'Back to Dashboard',
    'facilitator.overview': 'Overview',
    'facilitator.byQuestion': 'By Question',
    'facilitator.controlPanel': 'Control Panel',
    'facilitator.participants': 'Participants',
    'facilitator.hidePanel': 'Hide panel',
    'facilitator.showPanel': 'Show panel',
    
    // CONTROL PANEL
    'control.start': 'Start',
    'control.pause': 'Pause',
    'control.nextBoard': 'Next Board',
    'control.aiAnalysis': 'AI Analysis',
    'control.exportPDF': 'Export PDF',
    'control.soundOn': 'Sound On',
    'control.soundOff': 'Sound Off',
    
    // PARTICIPANTS
    'participants.title': 'Participants ({count})',
    'participants.noParticipants': 'No participants yet',
    'participants.deleteConfirm': 'Delete participant?',
    'participants.deleteConfirmDesc': 'Are you sure you want to remove {name} from the workshop? This cannot be undone.',
    'participants.cancel': 'Cancel',
    'participants.delete': 'Delete',
    
    // BOARD CARD
    'boardCard.label': 'Board {index}',
    'boardCard.title': 'Board Title',
    'boardCard.titlePlaceholder': 'E.g. Letter from the future',
    'boardCard.timeLimit': 'Time Limit (minutes)',
    'boardCard.questions': 'Questions ({current}/{max})',
    'boardCard.questionPlaceholder': 'Question {index}',
    'boardCard.addQuestion': 'Add Question',
    
    // AI ANALYSIS
    'ai.title': 'AI Analysis: {boardTitle}',
    'ai.description': 'Analyze {count} notes with AI to find themes and insights',
    'ai.notesLabel': 'Workshop Notes ({count})',
    'ai.customPrompt': 'Custom Prompt (optional)',
    'ai.promptPlaceholder': 'Describe how AI should analyze notes...',
    'ai.analyzeButton': 'Analyze with AI',
    'ai.analyzing': 'Analyzing...',
    'ai.aiAnalysisLabel': 'AI Analysis',
    'ai.copy': 'Copy',
    'ai.analyzingStatus': 'AI is analyzing your workshop notes...',
    'ai.analyzingWait': 'This may take a few seconds',
    'ai.clickToStart': 'Click "Analyze with AI" to start',
    
    // AUTH
    'auth.loginTitle': 'Facilitator Login',
    'auth.loginDescription': 'Log in with your name and PIN code',
    'auth.name': 'Name',
    'auth.namePlaceholder': 'Your name',
    'auth.pin': 'PIN Code (4-6 digits)',
    'auth.pinPlaceholder': '••••',
    'auth.loginButton': 'Log in',
    'auth.or': 'Or',
    'auth.createAccount': 'Create new account',
    'auth.registerTitle': 'Create Facilitator Account',
    'auth.registerDescription': 'Fill in your details to get started',
    'auth.nameOptional': 'Name / Company (optional)',
    'auth.nameOptionalPlaceholder': 'E.g. Anna Andersson',
    'auth.createPin': 'Create PIN Code (4-6 digits) *',
    'auth.confirmPin': 'Confirm PIN Code *',
    'auth.securityInfo': 'Security Question (optional, to reset PIN)',
    'auth.securityQuestion': 'Question',
    'auth.securityQuestionPlaceholder': 'E.g. What is your first pet\'s name?',
    'auth.securityAnswer': 'Answer',
    'auth.securityAnswerPlaceholder': 'Your answer',
    'auth.cancel': 'Cancel',
    'auth.createAccountButton': 'Create Account',
    'auth.resetPinTitle': 'Reset PIN Code',
    'auth.resetPinDescription': 'Answer the security question to create a new PIN',
    'auth.securityQuestionLabel': 'Security Question',
    'auth.yourAnswer': 'Your Answer',
    'auth.yourAnswerPlaceholder': 'Enter your answer',
    'auth.newPin': 'New PIN Code (4-6 digits)',
    'auth.confirmNewPin': 'Confirm New PIN Code',
    'auth.resetButton': 'Reset PIN',
    
    // COMMON
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    
    // NOT FOUND
    'notFound.message': 'Page not found',
    'notFound.home': 'Go to homepage',
  }
};

export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'sv';
  });

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || key;
    
    if (params) {
      Object.keys(params).forEach((param) => {
        text = text.replace(`{${param}}`, String(params[param]));
      });
    }
    
    return text;
  };

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return { t, language, changeLanguage };
};
