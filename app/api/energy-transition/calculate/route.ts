import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const VALID_EQUIPMENT_KEYS = [
  'sts_crane', 'rtg_crane', 'rmg_crane', 'asc',
  'straddle_carrier', 'agv', 'reach_stacker', 'ech',
  'terminal_tractor', 'high_bay_storage', 'mobile_harbor_crane', 'portal_crane',
]

export async function POST(request: Request) {
  try {
    const { quantities } = await request.json()

    // Validate: quantities is a Record<string, number> with equipment keys
    if (!quantities || typeof quantities !== 'object') {
      return NextResponse.json({ error: 'Missing quantities object' }, { status: 400 })
    }

    // Filter to only valid keys with qty > 0
    const requested: { key: string; qty: number }[] = []
    for (const key of VALID_EQUIPMENT_KEYS) {
      const qty = quantities[key]
      if (qty !== undefined && qty !== null && qty > 0) {
        if (typeof qty !== 'number' || qty < 0) {
          return NextResponse.json({ error: `Invalid quantity for ${key}` }, { status: 400 })
        }
        requested.push({ key, qty })
      }
    }

    if (requested.length === 0) {
      return NextResponse.json(
        { error: 'At least one equipment type must have a quantity greater than 0' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: assumptions, error } = await supabase
      .from('equipment_electrification_assumptions')
      .select('*')
      .in('equipment_key', requested.map(r => r.key))

    if (error || !assumptions || assumptions.length === 0) {
      return NextResponse.json({ error: 'Failed to load assumptions data' }, { status: 500 })
    }

    const equipmentResults = []
    let grandTotalCapex = 0
    let grandTotalAnnualOpex = 0
    let grandTotalAnnualEnergyCost = 0
    let grandTotalAnnualCo2Savings = 0
    let grandTotalAnnualDieselSavings = 0

    for (const { key, qty } of requested) {
      const assumption = assumptions.find((a: any) => a.equipment_key === key)
      if (!assumption) continue

      const unitCapex = parseFloat(assumption.unit_capex_usd)
      const installCost = parseFloat(assumption.installation_cost_usd)
      const annualOpex = parseFloat(assumption.annual_opex_usd)
      const annualEnergyKwh = parseFloat(assumption.annual_energy_kwh)
      const energyCostPerKwh = parseFloat(assumption.energy_cost_per_kwh)
      const annualCo2Savings = parseFloat(assumption.annual_co2_savings_tons)
      const annualDieselSavingsL = parseFloat(assumption.annual_diesel_savings_liters)
      const dieselPrice = parseFloat(assumption.diesel_price_per_liter)
      const lifespan = assumption.lifespan_years

      const totalCapex = (unitCapex + installCost) * qty
      const totalAnnualOpex = annualOpex * qty
      const totalAnnualEnergyKwh = annualEnergyKwh * qty
      const totalAnnualEnergyCost = totalAnnualEnergyKwh * energyCostPerKwh
      const totalAnnualCo2 = annualCo2Savings * qty
      const totalAnnualDieselL = annualDieselSavingsL * qty
      const totalAnnualDieselUsd = totalAnnualDieselL * dieselPrice

      const annualNetSavings = totalAnnualDieselUsd - totalAnnualOpex - totalAnnualEnergyCost
      const netAnnualCost = -annualNetSavings
      const paybackYears = annualNetSavings > 0 ? totalCapex / annualNetSavings : null
      const lifetimeNetSavings = annualNetSavings * lifespan - totalCapex

      grandTotalCapex += totalCapex
      grandTotalAnnualOpex += totalAnnualOpex
      grandTotalAnnualEnergyCost += totalAnnualEnergyCost
      grandTotalAnnualCo2Savings += totalAnnualCo2
      grandTotalAnnualDieselSavings += totalAnnualDieselUsd

      equipmentResults.push({
        equipment_key: key,
        display_name: assumption.display_name,
        equipment_type: assumption.equipment_type,
        unit_label: assumption.unit_label,
        quantity: qty,
        unit_capex_usd: unitCapex + installCost,
        total_capex_usd: totalCapex,
        total_annual_opex_usd: totalAnnualOpex,
        total_annual_energy_cost_usd: totalAnnualEnergyCost,
        total_annual_co2_savings_tons: totalAnnualCo2,
        total_annual_diesel_savings_usd: totalAnnualDieselUsd,
        net_annual_cost_usd: netAnnualCost,
        payback_years: paybackYears,
        lifetime_net_savings_usd: lifetimeNetSavings,
        lifespan_years: lifespan,
      })
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_investment_usd: grandTotalCapex,
        total_annual_opex_usd: grandTotalAnnualOpex,
        total_annual_energy_cost_usd: grandTotalAnnualEnergyCost,
        total_annual_co2_savings_tons: grandTotalAnnualCo2Savings,
        total_annual_diesel_savings_usd: grandTotalAnnualDieselSavings,
      },
      equipment: equipmentResults,
      inputs: quantities,
    })
  } catch (error: any) {
    console.error('Energy transition calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
