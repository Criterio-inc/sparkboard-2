import html2pdf from 'html2pdf.js';
import DOMPurify from 'dompurify';

interface Question {
  id: string;
  title: string;
}

interface Board {
  id: string;
  title: string;
  timeLimit: number;
  questions: Question[];
  colorIndex: number;
}

interface Note {
  id: string;
  questionId: string;
  content: string;
  authorName: string;
  timestamp: string;
}

interface ExportData {
  workshopTitle: string;
  date: string;
  boards: Board[];
  notesByBoard: Record<string, Note[]>;
  aiAnalyses?: Record<string, string>;
  participantCount: number;
}

const boardColorsHex = [
  '#9370DB',  // Purple
  '#34A8B7',  // Cyan
  '#2ECC71',  // Green
  '#E67E22',  // Orange
  '#E74C3C',  // Red
];

// Helper: Escape HTML
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Helper: Konvertera markdown till HTML (med DOMPurify-sanitering)
const markdownToHTML = (markdown: string): string => {
  // Sanitera input först för att förhindra XSS
  const sanitizedMarkdown = DOMPurify.sanitize(markdown, { ALLOWED_TAGS: [] });
  
  let html = sanitizedMarkdown
    // Rubriker
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Bullets (hantera olika typer: •, -, *)
  const lines = html.split('\n');
  let inList = false;
  const processedLines: string[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.match(/^[•\-\*] (.+)$/)) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      const content = trimmed.replace(/^[•\-\*] /, '');
      processedLines.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (trimmed && !trimmed.startsWith('<')) {
        processedLines.push(`<p>${trimmed}</p>`);
      } else {
        processedLines.push(line);
      }
    }
  });
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  // Sanitera den slutgiltiga HTML-outputen
  return DOMPurify.sanitize(processedLines.join('\n'), {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'li', 'strong'],
    ALLOWED_ATTR: []
  });
};

export const generateWorkshopPDF = async (data: ExportData) => {
  // Bygg HTML-struktur
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
          padding: 20px;
        }
        
        .header {
          background: #673AB7;
          color: white;
          padding: 20px;
          margin-bottom: 25px;
          border-radius: 4px;
        }
        
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 22pt;
          color: white;
        }
        
        .header p {
          margin: 4px 0;
          font-size: 10pt;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .board-section {
          margin-top: 30px;
          page-break-inside: avoid;
        }
        
        .board-title {
          background: #f5f5f5;
          padding: 12px 12px 12px 18px;
          margin-bottom: 15px;
          font-size: 15pt;
          font-weight: bold;
          border-left: 5px solid #666;
          color: #000;
        }
        
        .board-info {
          font-size: 9pt;
          color: #666;
          margin-bottom: 12px;
          padding-left: 18px;
        }
        
        .question-section {
          margin-bottom: 20px;
          padding-left: 10px;
        }
        
        .question-title {
          background: #f0f0f0;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 11pt;
          margin-bottom: 10px;
          color: #000;
          border-radius: 3px;
        }
        
        .notes-section {
          margin-bottom: 15px;
          padding-left: 15px;
        }
        
        .note-item {
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #fafafa;
          border-left: 3px solid #ddd;
          font-size: 10pt;
          line-height: 1.6;
        }
        
        .no-notes {
          font-style: italic;
          color: #999;
          font-size: 10pt;
          padding-left: 15px;
        }
        
        .ai-section {
          margin-top: 25px;
          page-break-inside: avoid;
          border: 2px solid #FFEB3B;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .ai-header {
          background: #FFEB3B;
          padding: 10px 15px;
          font-weight: bold;
          font-size: 12pt;
          color: #000;
        }
        
        .ai-content {
          padding: 18px;
          background: #fffef5;
        }
        
        .ai-content h1 {
          background: #673AB7;
          color: white;
          padding: 10px 12px;
          margin: 20px 0 15px 0;
          font-size: 14pt;
          border-radius: 3px;
        }
        
        .ai-content h1:first-child {
          margin-top: 0;
        }
        
        .ai-content h2 {
          background: #e0e0e0;
          padding: 10px 12px;
          margin: 20px 0 12px 0;
          font-size: 13pt;
          border-radius: 3px;
          color: #000;
        }
        
        .ai-content h2:first-child {
          margin-top: 0;
        }
        
        .ai-content h3 {
          margin: 15px 0 8px 0;
          font-size: 11pt;
          color: #555;
          font-weight: bold;
        }
        
        .ai-content p {
          margin: 10px 0;
          text-align: justify;
          line-height: 1.8;
        }
        
        .ai-content ul {
          margin: 12px 0;
          padding-left: 30px;
        }
        
        .ai-content li {
          margin: 7px 0;
          line-height: 1.7;
        }
        
        .ai-content strong {
          color: #000;
          font-weight: bold;
        }
        
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(data.workshopTitle)}</h1>
        <p><strong>Datum:</strong> ${escapeHtml(data.date)}</p>
        <p><strong>Deltagare:</strong> ${data.participantCount}</p>
      </div>
      
      ${data.boards.map((board, boardIndex) => {
        const notes = data.notesByBoard[board.id] || [];
        const analysis = data.aiAnalyses?.[board.id];
        const borderColor = boardColorsHex[board.colorIndex % boardColorsHex.length];
        
        return `
          <div class="board-section">
            <div class="board-title" style="border-left-color: ${borderColor}">
              Board ${boardIndex + 1}: ${escapeHtml(board.title)}
            </div>
            <div class="board-info">
              Tidsgräns: ${board.timeLimit} minuter
            </div>
            
            ${board.questions.map((question, qIndex) => {
              const questionNotes = notes.filter(n => n.questionId === question.id);
              
              return `
                <div class="question-section">
                  <div class="question-title">Fråga ${qIndex + 1}: ${escapeHtml(question.title)}</div>
                  ${questionNotes.length > 0 ? `
                    <div class="notes-section">
                      ${questionNotes.map(note => `
                        <div class="note-item">${escapeHtml(note.content)}</div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="no-notes">Inga svar</div>
                  `}
                </div>
              `;
            }).join('')}
            
            ${analysis ? `
              <div class="ai-section">
                <div class="ai-header">🤖 AI-Analys</div>
                <div class="ai-content">
                  ${markdownToHTML(analysis)}
                </div>
              </div>
            ` : ''}
          </div>
          ${boardIndex < data.boards.length - 1 ? '<div class="page-break"></div>' : ''}
        `;
      }).join('')}
    </body>
    </html>
  `;

  // Skapa element
  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  // PDF-inställningar
  const options = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: `${data.workshopTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' as const,
    },
    pagebreak: { 
      mode: ['avoid-all', 'css', 'legacy'],
    },
  };

  // Generera PDF
  await html2pdf().set(options).from(element).save();
};
