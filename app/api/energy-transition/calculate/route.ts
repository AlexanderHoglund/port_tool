import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { quantities } = await request.json()

    const categoryKeys = ['electric_tractor', 'ammonia_bunkering', 'shore_power', 'crane_electrification']

    for (const key of categoryKeys) {
      if (quantities[key] === undefined || quantities[key] < 0) {
        return NextResponse.json({ error: `Invalid quantity for ${key}` }, { status: 400 })
      }
    }

    const hasAny = categoryKeys.some(k => quantities[k] > 0)
    if (!hasAny) {
      return NextResponse.json({ error: 'At least one category must have a quantity greater than 0' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: assumptions, error } = await supabase
      .from('energy_transition_assumptions')
      .select('*')

    if (error || !assumptions || assumptions.length === 0) {
      return NextResponse.json({ error: 'Failed to load assumptions data' }, { status: 500 })
    }

    const categories = []
    let grandTotalCapex = 0
    let grandTotalAnnualOpex = 0
    let grandTotalAnnualEnergyCost = 0
    let grandTotalAnnualCo2Savings = 0
    let grandTotalAnnualDieselSavings = 0

    for (const key of categoryKeys) {
      const qty = quantities[key]
      if (qty === 0) continue

      const assumption = assumptions.find((a: any) => a.category_key === key)
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

      categories.push({
        category_key: key,
        display_name: assumption.display_name,
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
      categories,
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
