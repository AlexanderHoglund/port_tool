import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET all projects
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST create new project
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, initial_investment, discount_rate } = body

    if (!name || initial_investment === undefined || discount_rate === undefined) {
      return NextResponse.json(
        { error: 'Name, initial investment, and discount rate are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        initial_investment,
        discount_rate,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
