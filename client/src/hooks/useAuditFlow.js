import { useState } from 'react'

// Preguntas del flujo de auditoría
const AUDIT_FLOW = [
  {
    id: 'method',
    question: '¿Por qué método quieres buscar la zona?',
    type: 'buttons',
    options: [
      { label: 'Código Postal (CP)', value: 'cp' },
      { label: 'Dirección Completa', value: 'address' },
      { label: 'Municipio/Provincia', value: 'municipality' },
    ],
  },
  {
    id: 'location',
    question: null, // Dinámico según method
    type: 'input',
    placeholder: null, // Dinámico según method
  },
  {
    id: 'priority',
    question: '¿Cuál es la prioridad sectorial de la zona?',
    type: 'buttons',
    options: [
      { label: '🌾 Agrícola (invernaderos, cultivos)', value: 'agricultural' },
      { label: '🏙️ Urbana (consumo humano, riego parques)', value: 'urban' },
      { label: '⚖️ Mixta (equilibrado)', value: 'mixed' },
    ],
  },
  {
    id: 'seasonality',
    question: '¿Hay estacionalidad crítica de agua o calor?',
    type: 'buttons',
    options: [
      { label: 'Sí, estrés hídrico en verano (>35°C)', value: 'critical_summer' },
      { label: 'Sí, pero moderado', value: 'moderate' },
      { label: 'No, bastante estable todo el año', value: 'stable' },
    ],
  },
  {
    id: 'scale',
    question: '¿Prefieres un piloto o despliegue completo?',
    type: 'buttons',
    options: [
      { label: '🧪 Piloto (1-5 hectáreas, módulo modular)', value: 'pilot' },
      { label: '📈 Escala media (50-200 hectáreas)', value: 'medium' },
      { label: '🏗️ Despliegue completo (200+ hectáreas)', value: 'full' },
    ],
  },
]

export function useAuditFlow() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [isComplete, setIsComplete] = useState(false)

  const currentQuestion = AUDIT_FLOW[step]
  const method = answers.method

  // Enriquecer la pregunta de ubicación según el método elegido
  const questionToShow = {
    ...currentQuestion,
    question:
      currentQuestion.id === 'location'
        ? method === 'cp'
          ? 'Introduce el código postal'
          : method === 'address'
          ? 'Introduce la dirección completa'
          : 'Introduce el municipio o provincia'
        : currentQuestion.question,
    placeholder:
      currentQuestion.id === 'location'
        ? method === 'cp'
          ? 'Ej: 04700'
          : method === 'address'
          ? 'Ej: Calle Principal 42, Almería'
          : 'Ej: Almería o Almería (Provincia)'
        : null,
  }

  function handleAnswer(value) {
    const newAnswers = { ...answers, [currentQuestion.id]: value }
    setAnswers(newAnswers)

    // Validar si es la última pregunta
    if (step === AUDIT_FLOW.length - 1) {
      setIsComplete(true)
    } else {
      setStep(step + 1)
    }
  }

  function reset() {
    setStep(0)
    setAnswers({})
    setIsComplete(false)
  }

  return {
    step,
    totalSteps: AUDIT_FLOW.length,
    currentQuestion: questionToShow,
    answers,
    isComplete,
    handleAnswer,
    reset,
    progress: ((step + 1) / AUDIT_FLOW.length) * 100,
  }
}

// Función para generar informe mockeado basado en respuestas
export function generateMockReport(answers) {
  const { method, location, priority, seasonality, scale } = answers

  // Mock de datacenters cercanos según la ubicación
  const mockDatacenters = [
    {
      name: 'Centro de Datos Almería-1',
      distance: 8.5,
      capacity: 45,
      cooling: 'Absorción térmica',
      available: true,
    },
    {
      name: 'Instalaciones Roquetas-2',
      distance: 24.2,
      capacity: 30,
      cooling: 'Tradicional + Absorción',
      available: true,
    },
    {
      name: 'Nodo El Ejido-Tech',
      distance: 41.8,
      capacity: 20,
      cooling: 'Absorción (nuevo)',
      available: false,
    },
  ]

  const scaleSizing = {
    pilot: { water: '450-800', area: '5-10', capex: '180K-280K' },
    medium: { water: '5000-12000', area: '50-200', capex: '1.2M-2.8M' },
    full: { water: '15000-35000', area: '200-600', capex: '3.5M-8.5M' },
  }

  const sizing = scaleSizing[scale] || scaleSizing.pilot

  const ods = {
    agricultural: [
      { code: 2, name: 'Fin del Hambre (Agrícola)', color: '#FF6B00' },
      { code: 6, name: 'Agua Limpia y Saneamiento', color: '#26BDE2' },
      { code: 13, name: 'Acción Climática', color: '#3F7E44' },
    ],
    urban: [
      { code: 6, name: 'Agua Limpia y Saneamiento', color: '#26BDE2' },
      { code: 7, name: 'Energía Asequible y No Contaminante', color: '#FCCC0A' },
      { code: 13, name: 'Acción Climática', color: '#3F7E44' },
    ],
    mixed: [
      { code: 2, name: 'Fin del Hambre', color: '#FF6B00' },
      { code: 6, name: 'Agua Limpia y Saneamiento', color: '#26BDE2' },
      { code: 7, name: 'Energía Asequible', color: '#FCCC0A' },
      { code: 13, name: 'Acción Climática', color: '#3F7E44' },
    ],
  }

  return {
    timestamp: new Date().toLocaleString('es-ES'),
    location: {
      method,
      value: location,
      lat: 36.7372 + Math.random() * 0.3,
      lon: -2.4093 + Math.random() * 0.3,
    },
    summary: {
      priority,
      seasonality,
      scale,
      viability: scale === 'full' ? 'ALTA' : scale === 'medium' ? 'MUY ALTA' : 'EXCELENTE',
    },
    datacenters: mockDatacenters,
    recommendation: {
      primaryDC: mockDatacenters[0].name,
      distance: mockDatacenters[0].distance,
      coolingType: 'Refrigeración por Absorción Térmica',
      desalinization: 'Destilación Osmótica + Ósmosis Inversa',
    },
    sizing: {
      waterProductionDaily: sizing.water + ' L',
      servableArea: sizing.area + ' ha',
      estimatedCapex: sizing.capex + ' EUR',
      paybackYears: scale === 'pilot' ? '4-6' : scale === 'medium' ? '3-5' : '2-4',
    },
    ods: ods[priority] || ods.mixed,
    risks: [
      'Variabilidad estacional de temperatura',
      'Dependencia de suministro eléctrico del datacenter',
      'Mantenimiento de membranas de desalinización',
      seasonality === 'critical_summer' ? 'Picos de demanda en verano' : null,
    ].filter(Boolean),
    implementation: [
      { phase: 'Fase 1', duration: '2-3 meses', task: 'Auditoría técnica detallada y diseño' },
      { phase: 'Fase 2', duration: '4-6 meses', task: 'Instalación de infraestructura principal' },
      { phase: 'Fase 3', duration: '1-2 meses', task: 'Testing, calibración y puesta en marcha' },
      { phase: 'Fase 4', duration: 'Continuo', task: 'Monitoreo y optimización' },
    ],
  }
}
