import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { action, contactId, eventData, filters } = await req.json()

    let result

    switch (action) {
      case 'get_events':
        result = await getJourneyEvents(contactId, filters)
        break
      case 'add_event':
        result = await addJourneyEvent(contactId, eventData)
        break
      case 'update_event':
        result = await updateJourneyEvent(eventData.id, eventData)
        break
      case 'delete_event':
        result = await deleteJourneyEvent(eventData.id)
        break
      case 'get_timeline':
        result = await getJourneyTimeline(contactId, filters)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getJourneyEvents(contactId: string, filters: any = {}) {
  let query = supabaseClient
    .from('contact_journey_events')
    .select('*')
    .eq('contact_id', contactId)
    .order('event_date', { ascending: false })

  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.dateFrom) {
    query = query.gte('event_date', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('event_date', filters.dateTo)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

async function addJourneyEvent(contactId: string, eventData: any) {
  const { data, error } = await supabaseClient
    .from('contact_journey_events')
    .insert([{
      contact_id: contactId,
      event_type: eventData.eventType,
      title: eventData.title,
      description: eventData.description,
      event_date: eventData.eventDate,
      status: eventData.status || 'completed',
      metadata: eventData.metadata || {}
    }])
    .select()
    .single()

  if (error) throw error

  // Log activity
  await supabaseClient
    .from('contact_activities')
    .insert([{
      contact_id: contactId,
      activity_type: 'journey_event_added',
      description: `Added journey event: ${eventData.title}`,
      metadata: { eventId: data.id, eventType: eventData.eventType }
    }])

  return data
}

async function updateJourneyEvent(eventId: string, eventData: any) {
  const { data, error } = await supabaseClient
    .from('contact_journey_events')
    .update({
      event_type: eventData.eventType,
      title: eventData.title,
      description: eventData.description,
      event_date: eventData.eventDate,
      status: eventData.status,
      metadata: eventData.metadata
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error

  return data
}

async function deleteJourneyEvent(eventId: string) {
  const { error } = await supabaseClient
    .from('contact_journey_events')
    .delete()
    .eq('id', eventId)

  if (error) throw error

  return { success: true }
}

async function getJourneyTimeline(contactId: string, filters: any = {}) {
  const events = await getJourneyEvents(contactId, filters)

  // Group events by month/year for timeline display
  const groupedEvents = events.reduce((acc: any, event: any) => {
    const date = new Date(event.event_date)
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!acc[monthYear]) {
      acc[monthYear] = []
    }

    acc[monthYear].push(event)
    return acc
  }, {})

  // Sort months chronologically
  const sortedMonths = Object.keys(groupedEvents).sort().reverse()

  return {
    timeline: sortedMonths.map(month => ({
      month,
      events: groupedEvents[month].sort((a: any, b: any) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      )
    })),
    totalEvents: events.length,
    summary: generateTimelineSummary(events)
  }
}

function generateTimelineSummary(events: any[]) {
  const summary = {
    totalEvents: events.length,
    completedEvents: 0,
    scheduledEvents: 0,
    cancelledEvents: 0,
    eventTypes: {} as any,
    recentActivity: 0
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  events.forEach(event => {
    // Count by status
    switch (event.status) {
      case 'completed':
        summary.completedEvents++
        break
      case 'scheduled':
        summary.scheduledEvents++
        break
      case 'cancelled':
        summary.cancelledEvents++
        break
    }

    // Count by type
    summary.eventTypes[event.event_type] = (summary.eventTypes[event.event_type] || 0) + 1

    // Count recent activity
    if (new Date(event.event_date) >= thirtyDaysAgo) {
      summary.recentActivity++
    }
  })

  return summary
}