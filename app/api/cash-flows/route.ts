import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET cash flows for a project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: cashFlows, error } = await supabase
      .from('cash_flows')
      .select('*')
      .eq('project_id', projectId)
      .order('period', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cashFlows })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST create new cash flow
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { project_id, period, amount, description } = body

    if (!project_id || !period || amount === undefined) {
      return NextResponse.json(
        { error: 'Project ID, period, and amount are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: cashFlow, error } = await supabase
      .from('cash_flows')
      .insert({
        project_id,
        period,
        amount,
        description,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cashFlow }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE cash flow
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Cash flow ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('cash_flows')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
