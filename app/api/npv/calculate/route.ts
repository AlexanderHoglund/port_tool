import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Fetch cash flows
    const { data: cashFlows, error: cashFlowsError } = await supabase
      .from('cash_flows')
      .select('*')
      .eq('project_id', projectId)
      .order('period', { ascending: true })

    if (cashFlowsError) {
      return NextResponse.json(
        { error: 'Error fetching cash flows' },
        { status: 500 }
      )
    }

    if (!cashFlows || cashFlows.length === 0) {
      return NextResponse.json(
        { error: 'No cash flows found for this project' },
        { status: 400 }
      )
    }

    // Calculate NPV
    // NPV = -Initial Investment + Σ [Cash Flow / (1 + r)^t]
    const discountRate = parseFloat(project.discount_rate)
    const initialInvestment = parseFloat(project.initial_investment)

    let npv = -initialInvestment

    cashFlows.forEach((cf: any) => {
      const period = cf.period
      const amount = parseFloat(cf.amount)
      const presentValue = amount / Math.pow(1 + discountRate, period)
      npv += presentValue
    })

    // Save NPV result
    const { data: npvResult, error: npvError } = await supabase
      .from('npv_results')
      .insert({
        project_id: projectId,
        npv_value: npv,
        discount_rate_used: discountRate,
        total_periods: cashFlows.length,
      })
      .select()
      .single()

    if (npvError) {
      console.error('Error saving NPV result:', npvError)
    }

    return NextResponse.json({
      success: true,
      npv: npv,
      project: project.name,
      discount_rate: discountRate,
      initial_investment: initialInvestment,
      total_periods: cashFlows.length,
      cash_flows: cashFlows,
    })
  } catch (error: any) {
    console.error('NPV calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
