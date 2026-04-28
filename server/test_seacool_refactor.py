"""
Script de prueba para verificar los nuevos endpoints de SeaCool.
Ejecutar después de: pip install -r requirements.txt && uvicorn main:app --reload
"""

import asyncio
import json
from app.services.api_connectors import RealWorldContextAggregator, OpenMeteoConnector
from app.services.scenarios_service import scenario_evaluator


async def test_api_connectors():
    """Prueba los conectores de APIs externas."""
    print("\n" + "="*80)
    print("TEST 1: Conectores de APIs Externas")
    print("="*80)
    
    # Test 1.1: Open-Meteo
    print("\n1.1 — Open-Meteo (Clima en Almería):")
    climate = await OpenMeteoConnector.get_climate_data(36.7, -2.5)
    print(json.dumps(climate, indent=2, ensure_ascii=False))
    
    # Test 1.2: Contexto completo
    print("\n1.2 — Contexto Completo (Todos los conectores):")
    context = await RealWorldContextAggregator.gather_full_context(
        latitude=36.7,
        longitude=-2.5,
        region="almeria",
    )
    print(json.dumps(context, indent=2, ensure_ascii=False, default=str))


async def test_scenario_evaluator():
    """Prueba el evaluador de escenarios."""
    print("\n" + "="*80)
    print("TEST 2: Evaluador de Escenarios")
    print("="*80)
    
    result = await scenario_evaluator.evaluate_scenarios(
        dc_power_mw=50,
        latitude=36.7,
        longitude=-2.5,
        region="almeria",
        mes="julio",
        carga_dc_pct=75,
    )
    
    print("\nResultado de evaluación de escenarios:")
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))


async def main():
    """Ejecuta todos los tests."""
    try:
        print("\n🧪 TESTING: SeaCool Refactor — APIs Reales + Escenarios Dinámicos")
        
        await test_api_connectors()
        print("\n✅ Test 1 completado")
        
        # await test_scenario_evaluator()  # Descomentar después de configurar LLM
        # print("\n✅ Test 2 completado")
        
        print("\n" + "="*80)
        print("✅ TODOS LOS TESTS COMPLETADOS")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ Error en tests: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
