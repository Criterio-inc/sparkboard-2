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

export const generateWorkshopPDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header with gradient effect (simulated with rectangles)
  doc.setFillColor(103, 58, 183); // Primary purple
  doc.rect(0, 0, pageWidth, 40, "F");
  
  // Workshop Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(data.workshopTitle, pageWidth / 2, 20, { align: "center" });

  // Date and participant count
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Datum: ${data.date}`, pageWidth / 2, 28, { align: "center" });
  doc.text(`Deltagare: ${data.participantCount}`, pageWidth / 2, 35, { align: "center" });

  yPosition = 50;

  // Process each board
  data.boards.forEach((board, boardIndex) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    const boardColor = boardColorsRGB[board.colorIndex % boardColorsRGB.length];

    // Board header with color bar
    doc.setFillColor(boardColor.r, boardColor.g, boardColor.b);
    doc.rect(10, yPosition - 5, 5, 15, "F");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Board ${boardIndex + 1}: ${board.title}`, 20, yPosition + 5);
    
    yPosition += 15;

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
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }

      // Question header
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPosition - 3, pageWidth - 30, 10, "F");
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Fråga ${qIndex + 1}: ${question.title}`, 20, yPosition + 4);
      yPosition += 15;

      // Get notes for this question
      const questionNotes = boardNotes.filter((n) => n.questionId === question.id);

      if (questionNotes.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150, 150, 150);
        doc.text("Inga svar", 25, yPosition);
        yPosition += 10;
      } else {
        // Create table for notes
        const tableData = questionNotes.map((note) => [
          note.authorName,
          note.timestamp,
          note.content,
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Deltagare", "Tid", "Innehåll"]],
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
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: "auto" },
          },
          margin: { left: 20, right: 15 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    });

    // Add AI Analysis if available
    if (data.aiAnalyses && data.aiAnalyses[board.id]) {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // AI Analysis header
      doc.setFillColor(255, 235, 59); // Yellow highlight
      doc.rect(15, yPosition - 3, pageWidth - 30, 10, "F");
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("🤖 AI-Analys", 20, yPosition + 4);
      yPosition += 15;

      // AI Analysis content
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);

      const analysisText = data.aiAnalyses[board.id];
      const lines = doc.splitTextToSize(analysisText, pageWidth - 40);
      
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += 5;
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
      `Sida ${i} av ${totalPages} • Genererad med Idélabbet`,
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
