import { useState, useRef } from 'react'
import { exportElementAsPDF, exportPatientReportPDF } from '../../services/pdfExport'

/**
 * Reusable button to export a DOM element or structured data as PDF.
 *
 * Props:
 *  - mode: 'element' | 'report' (default: 'element')
 *  - elementRef: ref to the DOM element (mode='element')
 *  - filename: string
 *  - patient, exercises, diaryEntries, therapistName (mode='report')
 */
export default function ExportPDFButton({
  mode = 'element',
  elementRef,
  filename = 'relatorio',
  patient,
  exercises,
  diaryEntries,
  therapistName,
  label = 'Exportar PDF',
}) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      if (mode === 'report') {
        exportPatientReportPDF(patient, exercises, diaryEntries, therapistName)
      } else {
        await exportElementAsPDF(elementRef?.current, filename)
      }
    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        background: loading ? '#a5b4fc' : '#6366f1',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        transition: 'background 0.2s',
      }}
    >
      {loading ? (
        <>
          <span style={{ fontSize: '13px' }}>⏳</span> Gerando PDF...
        </>
      ) : (
        <>
          <span style={{ fontSize: '13px' }}>📄</span> {label}
        </>
      )}
    </button>
  )
}