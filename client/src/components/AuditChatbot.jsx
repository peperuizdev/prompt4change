import { useState } from 'react'
import { useAuditFlow, generateMockReport } from '../hooks/useAuditFlow'
import AuditReport from './ui/AuditReport'

export default function AuditChatbot({ onClose }) {
  const flow = useAuditFlow()
  const [showReport, setShowReport] = useState(false)
  const [report, setReport] = useState(null)

  const currentQ = flow.currentQuestion

  function handleAnswer(value) {
    flow.handleAnswer(value)
  }

  function handleFinish() {
    const generatedReport = generateMockReport(flow.answers)
    setReport(generatedReport)
    setShowReport(true)
  }

  if (showReport && report) {
    return <AuditReport report={report} onBack={() => setShowReport(false)} onClose={onClose} />
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003366] to-[#006d37] text-white p-6 flex justify-between items-center">
        <div>
          <h2 className="font-display-md text-headline-lg">Auditoría de Soluciones SeaCool</h2>
          <p className="text-body-sm opacity-90">Responde estas preguntas para obtener un informe personalizado</p>
        </div>
        <button
          onClick={onClose}
          className="material-symbols-outlined text-2xl hover:scale-110 transition-transform"
        >
          close
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-on-surface-variant uppercase">
            Pregunta {flow.step + 1} de {flow.totalSteps}
          </span>
          <span className="text-xs font-bold text-on-surface-variant">{Math.round(flow.progress)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#003366] to-[#006d37] transition-all duration-300" style={{ width: `${flow.progress}%` }} />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Bot Message */}
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-[#003366] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-on-surface mb-2 bg-slate-50 p-4 rounded-lg rounded-tl-none">
              {currentQ.question}
            </p>
            {currentQ.type === 'buttons' && (
              <div className="space-y-2 mt-3">
                {currentQ.options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="w-full text-left p-3 rounded-lg border-2 border-slate-200 hover:border-[#003366] hover:bg-slate-50 transition-all font-medium text-sm text-on-surface"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Response */}
        {flow.answers[currentQ.id] && currentQ.type === 'buttons' && (
          <div className="flex gap-4 justify-end">
            <div className="max-w-xs">
              <p className="text-sm font-semibold text-on-surface bg-[#003366]/10 p-4 rounded-lg rounded-tr-none text-[#003366]">
                {currentQ.options.find(o => o.value === flow.answers[currentQ.id])?.label}
              </p>
            </div>
          </div>
        )}

        {/* Input Field for location */}
        {currentQ.type === 'input' && (
          <div className="flex gap-4">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder={currentQ.placeholder}
                onKeyPress={e => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleAnswer(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/10 outline-none text-sm"
              />
              <button
                onClick={e => {
                  const input = e.target.previousElementSibling
                  if (input.value.trim()) {
                    handleAnswer(input.value)
                    input.value = ''
                  }
                }}
                className="px-4 py-2 bg-[#003366] text-white rounded-lg hover:brightness-110 transition-all font-bold text-sm"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-200 p-6 flex gap-3 justify-between">
        <button
          onClick={() => flow.reset()}
          className="px-4 py-2 text-on-surface-variant hover:bg-slate-100 rounded-lg font-bold text-sm"
        >
          Reiniciar
        </button>
        <button
          onClick={handleFinish}
          disabled={!flow.isComplete}
          className="px-6 py-2 bg-gradient-to-r from-[#003366] to-[#006d37] text-white rounded-lg hover:brightness-110 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">assignment</span>
          Generar Informe
        </button>
      </div>
    </div>
  )
}
