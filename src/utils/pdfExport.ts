import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// Board colors matching the app (converted to RGB for PDF)
const boardColorsRGB = [
  { r: 147, g: 112, b: 219 }, // Purple
  { r: 52, g: 168, b: 183 },  // Cyan
  { r: 46, g: 204, b: 113 },  // Green
  { r: 230, g: 126, b: 34 },  // Orange
  { r: 231, g: 76, b: 60 },   // Red
];

// Markdown element types for PDF rendering
interface MarkdownElement {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'list-item' | 'empty';
  content: string;
  indent?: number;
}

// Helper: Remove bold markdown syntax but keep text
const cleanBoldMarkdown = (text: string): string => {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
};

// Parse markdown text into structured elements for PDF rendering
const parseMarkdownForPDF = (markdown: string): MarkdownElement[] => {
  const lines = markdown.split('\n');
  const elements: MarkdownElement[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (trimmed === '') {
      elements.push({ type: 'empty', content: '' });
    } else if (trimmed.startsWith('### ')) {
      elements.push({ type: 'h3', content: trimmed.replace('### ', '') });
    } else if (trimmed.startsWith('## ')) {
      elements.push({ type: 'h2', content: trimmed.replace('## ', '') });
    } else if (trimmed.startsWith('# ')) {
      elements.push({ type: 'h1', content: trimmed.replace('# ', '') });
    } else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[•\-*]\s/, '');
      elements.push({ type: 'list-item', content: cleanBoldMarkdown(content), indent: 25 });
    } else {
      elements.push({ type: 'paragraph', content: cleanBoldMarkdown(trimmed) });
    }
  });
  
  return elements;
};

// Render a markdown element with appropriate styling
const renderMarkdownElement = (
  doc: jsPDF,
  element: MarkdownElement,
  currentY: number,
  maxWidth: number,
  pageWidth: number,
  checkPageBreak: (space: number) => number
): number => {
  let y = currentY;
  
  switch (element.type) {
    case 'h1':
      y = checkPageBreak(12);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 48, 92); // Primary color
      doc.text(element.content, 20, y);
      y += 10;
      break;
      
    case 'h2':
      y = checkPageBreak(10);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(65, 59, 97); // Secondary color
      doc.text(element.content, 20, y);
      y += 8;
      break;
      
    case 'h3':
      y = checkPageBreak(8);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(174, 125, 172); // Accent color
      doc.text(element.content, 20, y);
      y += 7;
      break;
      
    case 'paragraph':
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      
      const paragraphLines = doc.splitTextToSize(element.content, maxWidth - 5);
      paragraphLines.forEach((line: string) => {
        y = checkPageBreak(6);
        doc.text(line, 20, y);
        y += 5;
      });
      y += 3; // Extra space after paragraph
      break;
      
    case 'list-item':
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      
      // Bullet symbol
      doc.text('•', element.indent || 25, y);
      
      // Wrapped text with indent
      const listLines = doc.splitTextToSize(element.content, maxWidth - 15);
      listLines.forEach((line: string, index: number) => {
        y = checkPageBreak(6);
        doc.text(line, (element.indent || 25) + 5, y);
        if (index < listLines.length - 1) y += 5;
      });
      y += 5;
      break;
      
    case 'empty':
      y += 4; // Extra spacing for empty lines
      break;
  }
  
  return y;
};

export const generateWorkshopPDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - 40; // 20px margin on each side
  let yPosition = 20;

  // Helper function to check and handle page breaks
  const checkPageBreak = (requiredSpace: number): number => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      return 20; // New Y position on new page
    }
    return yPosition;
  };

  // Header with gradient effect (simulated with rectangles)
  doc.setFillColor(103, 58, 183); // Primary purple
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Workshop Title with text wrapping
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(data.workshopTitle, maxWidth);
  let titleY = 20;
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, titleY, { align: "center" });
    titleY += 8;
  });

  // Date and participant count
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Datum: ${data.date}`, pageWidth / 2, titleY + 3, { align: "center" });
  doc.text(`Deltagare: ${data.participantCount}`, pageWidth / 2, titleY + 10, { align: "center" });

  yPosition = Math.max(50, titleY + 20);

  // Process each board
  data.boards.forEach((board, boardIndex) => {
    // Check if we need a new page
    yPosition = checkPageBreak(60);

    const boardColor = boardColorsRGB[board.colorIndex % boardColorsRGB.length];

    // Board header with color bar
    doc.setFillColor(boardColor.r, boardColor.g, boardColor.b);
    doc.rect(10, yPosition - 5, 5, 15, "F");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    
    // Board title with text wrapping
    const boardTitleLines = doc.splitTextToSize(`Board ${boardIndex + 1}: ${board.title}`, maxWidth - 20);
    boardTitleLines.forEach((line: string, index: number) => {
      doc.text(line, 20, yPosition + 5 + (index * 7));
    });
    
    yPosition += 5 + (boardTitleLines.length * 7) + 5;

    // Board info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Tidsgräns: ${board.timeLimit} minuter`, 20, yPosition);
    yPosition += 10;

    const boardNotes = data.notesByBoard[board.id] || [];

    // Process each question
    board.questions.forEach((question, qIndex) => {
      // Check if we need a new page
      yPosition = checkPageBreak(80);

      // Question header with text wrapping
      doc.setFillColor(240, 240, 240);
      const questionLines = doc.splitTextToSize(`Fråga ${qIndex + 1}: ${question.title}`, maxWidth - 30);
      const questionHeight = (questionLines.length * 6) + 6;
      doc.rect(15, yPosition - 3, pageWidth - 30, questionHeight, "F");
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      
      questionLines.forEach((line: string, index: number) => {
        doc.text(line, 20, yPosition + 4 + (index * 6));
      });
      
      yPosition += questionHeight + 5;

      // Get notes for this question
      const questionNotes = boardNotes.filter((n) => n.questionId === question.id);

      if (questionNotes.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150, 150, 150);
        doc.text("Inga svar", 25, yPosition);
        yPosition += 10;
      } else {
        // Create table for notes (without participant names for anonymity)
        const tableData = questionNotes.map((note) => [
          note.content,
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Innehåll"]],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [boardColor.r, boardColor.g, boardColor.b],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: "bold",
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: "auto" },
          },
          margin: { left: 20, right: 15 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    });

    // Add AI Analysis if available
    if (data.aiAnalyses && data.aiAnalyses[board.id]) {
      // Check if we need a new page
      yPosition = checkPageBreak(60);

      // AI Analysis header
      doc.setFillColor(255, 235, 59); // Yellow highlight
      doc.rect(15, yPosition - 3, pageWidth - 30, 10, "F");
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("🤖 AI-Analys", 20, yPosition + 4);
      yPosition += 15;

      // AI Analysis content with markdown parsing
      const analysisText = data.aiAnalyses[board.id];
      const markdownElements = parseMarkdownForPDF(analysisText);

      markdownElements.forEach(element => {
        yPosition = renderMarkdownElement(
          doc,
          element,
          yPosition,
          maxWidth,
          pageWidth,
          checkPageBreak
        );
      });

      yPosition += 5;
    }

    yPosition += 10; // Space between boards
  });

  // Footer on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Sida ${i} av ${totalPages} • Genererad med Sparkboard`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Generate filename with date
  const filename = `${data.workshopTitle.replace(/\s+/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  // Download the PDF
  doc.save(filename);
};
