import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Captures a DOM element and exports it as a PDF file.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - Name of the PDF file (without extension)
 * @returns {Promise<void>}
 */
export async function exportElementAsPDF(element, filename = 'relatorio') {
  if (!element) throw new Error('Element not found for PDF export.')

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * pageWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(`${filename}.pdf`)
}

/**
 * Generates a structured patient progress report as PDF using jsPDF directly
 * (no DOM capture needed — pure data rendering).
 *
 * @param {object} patient  - { name, email }
 * @param {object[]} exercises - Array of completed exercises
 * @param {object[]} diaryEntries - Array of diary entries { date, mood, energy, anxiety, motivation }
 * @param {string} therapistName
 * @returns {void}
 */
export function exportPatientReportPDF(patient, exercises, diaryEntries, therapistName) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 16
  const lineHeight = 7
  let y = margin

  const addText = (text, x, size = 11, style = 'normal', color = [30, 30, 30]) => {
    pdf.setFontSize(size)
    pdf.setFont('helvetica', style)
    pdf.setTextColor(...color)
    pdf.text(text, x, y)
    y += lineHeight
  }

  const addDivider = () => {
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 4
  }

  const checkPageBreak = (needed = lineHeight * 2) => {
    if (y + needed > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage()
      y = margin
    }
  }

  // --- Header ---
  pdf.setFillColor(99, 102, 241) // indigo-500
  pdf.rect(0, 0, pageWidth, 28, 'F')
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.text('Equilibre', margin, 12)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Relatório de Progresso do Paciente', margin, 20)
  y = 36

  // --- Patient Info ---
  addText(`Paciente: ${patient?.name ?? '—'}`, margin, 13, 'bold')
  addText(`E-mail: ${patient?.email ?? '—'}`, margin, 10)
  addText(`Terapeuta: ${therapistName ?? '—'}`, margin, 10)
  addText(
    `Data do relatório: ${new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })}`,
    margin, 10
  )
  y += 4
  addDivider()

  // --- Exercises ---
  addText('Exercícios Concluídos', margin, 13, 'bold', [99, 102, 241])
  y += 2

  if (!exercises || exercises.length === 0) {
    addText('Nenhum exercício concluído registrado.', margin, 10, 'italic', [120, 120, 120])
  } else {
    exercises.forEach((ex, i) => {
      checkPageBreak(lineHeight * 3)
      addText(
        `${i + 1}. ${ex.title ?? 'Sem título'}`,
        margin, 11, 'bold'
      )
      if (ex.completed_at) {
        const dateStr = new Date(ex.completed_at).toLocaleDateString('pt-BR')
        addText(`   Concluído em: ${dateStr}`, margin, 9, 'normal', [100, 100, 100])
      }
    })
  }

  y += 4
  addDivider()

  // --- Diary ---
  addText('Diário Emocional (últimas entradas)', margin, 13, 'bold', [99, 102, 241])
  y += 2

  const MOOD_LABELS = ['Muito mal', 'Mal', 'Regular', 'Bem', 'Muito bem']

  if (!diaryEntries || diaryEntries.length === 0) {
    addText('Nenhuma entrada no diário.', margin, 10, 'italic', [120, 120, 120])
  } else {
    const recent = diaryEntries.slice(0, 10)
    recent.forEach((entry) => {
      checkPageBreak(lineHeight * 2)
      const dateStr = new Date(entry.date).toLocaleDateString('pt-BR')
      const moodLabel = MOOD_LABELS[entry.mood] ?? entry.mood
      addText(
        `• ${dateStr} — Humor: ${moodLabel}${entry.energy != null ? `  |  Energia: ${entry.energy}/10` : ''}`,
        margin, 9
      )
    })
  }

  // --- Footer ---
  const pageCount = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(160, 160, 160)
    pdf.text(
      `Equilibre © ${new Date().getFullYear()} · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  const safeName = (patient?.name ?? 'paciente').replace(/\s+/g, '_').toLowerCase()
  pdf.save(`relatorio_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
