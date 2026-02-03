import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const {
      region,
      ship_type,
      fuel_type,
      annual_energy_demand_mwh,
      discount_rate,
      co2_tax_per_ton,
      save_scenario
    } = await request.json()

    // Validate inputs
    if (!region || !ship_type || !fuel_type || !annual_energy_demand_mwh || discount_rate === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Check fuel availability
    const { data: availability } = await supabase
      .from('fuel_availability')
      .select('is_available')
      .eq('region', region)
      .eq('fuel_type', fuel_type)
      .single()

    if (!availability?.is_available) {
      return NextResponse.json({
        error: `${fuel_type} is not available in ${region}`,
        fuel_available: false
      }, { status: 400 })
    }

    // 2. Get fuel properties
    const { data: fuelProps } = await supabase
      .from('fuel_properties')
      .select('*')
      .eq('fuel_type', fuel_type)
      .single()

    if (!fuelProps) {
      return NextResponse.json({ error: 'Fuel properties not found' }, { status: 404 })
    }

    // 3. Get regional factor
    const { data: regionalFactor } = await supabase
      .from('regional_factors')
      .select('adjustment_factor')
      .eq('region', region)
      .eq('fuel_type', fuel_type)
      .single()

    if (!regionalFactor) {
      return NextResponse.json({ error: 'Regional factor not found' }, { status: 404 })
    }

    // 4. Get CAPEX
    const { data: capexData } = await supabase
      .from('capex_data')
      .select('capex_usd')
      .eq('ship_type', ship_type)
      .eq('fuel_type', fuel_type)
      .single()

    if (!capexData) {
      return NextResponse.json({ error: 'CAPEX data not found' }, { status: 404 })
    }

    // 5. Get OPEX
    const { data: opexData } = await supabase
      .from('opex_data')
      .select('annual_opex_usd')
      .eq('ship_type', ship_type)
      .eq('fuel_type', fuel_type)
      .single()

    if (!opexData) {
      return NextResponse.json({ error: 'OPEX data not found' }, { status: 404 })
    }

    // 6. Get fuel prices (2025-2035)
    const { data: fuelPrices } = await supabase
      .from('fuel_prices')
      .select('*')
      .eq('fuel_type', fuel_type)
      .order('year')

    if (!fuelPrices || fuelPrices.length === 0) {
      return NextResponse.json({ error: 'Fuel prices not found' }, { status: 404 })
    }

    // === CALCULATIONS ===

    // Calculate annual fuel mass
    // Energy (MWh) * 3600 (MJ/MWh) / LHV (MJ/kg) / 1000 (kg/ton)
    const annualFuelMassTons = (annual_energy_demand_mwh * 3600) / (fuelProps.lhv_mj_per_kg * 1000)

    const capex = parseFloat(capexData.capex_usd.toString())
    const annualOpex = parseFloat(opexData.annual_opex_usd.toString())
    const emissionFactor = parseFloat(fuelProps.emission_factor.toString())
    const adjustmentFactor = parseFloat(regionalFactor.adjustment_factor.toString())

    // Calculate annual emissions
    const annualEmissionsTons = annualFuelMassTons * emissionFactor

    // Year-by-year calculations
    const yearlyProjections = []
    let totalPresentValue = capex // Start with CAPEX
    let totalEmissions = 0

    for (const priceData of fuelPrices) {
      const year = priceData.year
      const baseFuelPrice = parseFloat(priceData.price_per_ton.toString())
      const adjustedFuelPrice = baseFuelPrice * adjustmentFactor

      // Calculate costs
      const fuelCost = annualFuelMassTons * adjustedFuelPrice
      const carbonCost = annualEmissionsTons * (co2_tax_per_ton || 0)
      const totalAnnualCost = fuelCost + annualOpex + carbonCost

      // Calculate discount factor and present value
      const yearIndex = year - 2025
      const discountFactor = Math.pow(1 + discount_rate, -yearIndex)
      const presentValue = totalAnnualCost * discountFactor

      totalPresentValue += presentValue
      totalEmissions += annualEmissionsTons

      yearlyProjections.push({
        year,
        fuel_price_per_ton: adjustedFuelPrice,
        fuel_cost_usd: fuelCost,
        opex_usd: annualOpex,
        carbon_cost_usd: carbonCost,
        total_annual_cost_usd: totalAnnualCost,
        discount_factor: discountFactor,
        present_value_usd: presentValue,
        emissions_tco2e: annualEmissionsTons
      })
    }

    // Save scenario if requested
    let scenarioId = null
    if (save_scenario) {
      const { data: scenario } = await supabase
        .from('tco_scenarios')
        .insert({
          name: `${ship_type} - ${fuel_type} - ${region}`,
          region,
          ship_type,
          fuel_type,
          annual_energy_demand_mwh,
          discount_rate,
          co2_tax_per_ton: co2_tax_per_ton || 0
        })
        .select()
        .single()

      if (scenario) {
        scenarioId = scenario.id

        // Save result
        const { data: result } = await supabase
          .from('tco_results')
          .insert({
            scenario_id: scenarioId,
            total_capex_usd: capex,
            net_present_cost_usd: totalPresentValue,
            total_emissions_tco2e: totalEmissions,
            annual_fuel_mass_tons: annualFuelMassTons,
            fuel_available: true
          })
          .select()
          .single()

        // Save annual projections
        if (result) {
          const projectionsToInsert = yearlyProjections.map(p => ({
            result_id: result.id,
            ...p
          }))

          await supabase
            .from('annual_projections')
            .insert(projectionsToInsert)
        }
      }
    }

    return NextResponse.json({
      success: true,
      scenario_id: scenarioId,
      fuel_available: true,
      total_capex_usd: capex,
      net_present_cost_usd: totalPresentValue,
      total_emissions_tco2e: totalEmissions,
      annual_fuel_mass_tons: annualFuelMassTons,
      annual_emissions_tons: annualEmissionsTons,
      yearly_projections: yearlyProjections,
      inputs: {
        region,
        ship_type,
        fuel_type,
        annual_energy_demand_mwh,
        discount_rate,
        co2_tax_per_ton: co2_tax_per_ton || 0
      }
    })

  } catch (error: any) {
    console.error('TCO calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
