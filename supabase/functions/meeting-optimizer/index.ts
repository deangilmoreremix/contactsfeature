import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    const { meetingData, optimizationType } = await req.json()

    const optimizedMeeting = await optimizeMeeting(meetingData, optimizationType)

    return new Response(JSON.stringify(optimizedMeeting), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function optimizeMeeting(meetingData: any, optimizationType: string) {
  const optimized = {
    originalData: meetingData,
    optimizationType: optimizationType || 'comprehensive',
    optimizedSchedule: {},
    optimizedAgenda: [],
    participantOptimization: {},
    recommendations: [],
    predictedOutcomes: {},
    riskFactors: [],
    optimizedAt: new Date().toISOString()
  }

  switch (optimizationType) {
    case 'schedule':
      optimized.optimizedSchedule = await optimizeSchedule(meetingData)
      break
    case 'agenda':
      optimized.optimizedAgenda = await optimizeAgenda(meetingData)
      break
    case 'participants':
      optimized.participantOptimization = await optimizeParticipants(meetingData)
      break
    default:
      optimized.optimizedSchedule = await optimizeSchedule(meetingData)
      optimized.optimizedAgenda = await optimizeAgenda(meetingData)
      optimized.participantOptimization = await optimizeParticipants(meetingData)
  }

  // Generate recommendations
  optimized.recommendations = await generateMeetingRecommendations(meetingData, optimized)

  // Predict outcomes
  optimized.predictedOutcomes = await predictMeetingOutcomes(meetingData, optimized)

  // Identify risk factors
  optimized.riskFactors = await identifyMeetingRisks(meetingData, optimized)

  return optimized
}

async function optimizeSchedule(meetingData: any) {
  const { participants, duration, preferredTimes, timeZone } = meetingData

  const optimized = {
    recommendedTime: '',
    recommendedDate: '',
    duration: duration || 60,
    timeZone: timeZone || 'UTC',
    alternatives: [],
    reasoning: '',
    confidence: 0
  }

  // Analyze participant availability
  const availability = await analyzeParticipantAvailability(participants)

  // Find optimal time slot
  const optimalSlot = findOptimalTimeSlot(availability, duration, preferredTimes)

  optimized.recommendedTime = optimalSlot.time
  optimized.recommendedDate = optimalSlot.date
  optimized.alternatives = optimalSlot.alternatives
  optimized.reasoning = generateScheduleReasoning(optimalSlot, participants)
  optimized.confidence = calculateScheduleConfidence(optimalSlot, participants)

  return optimized
}

async function optimizeAgenda(meetingData: any) {
  const { topic, participants, objectives, duration } = meetingData

  const optimized = []

  // Estimate time allocation
  const totalDuration = duration || 60
  const timeAllocations = estimateTimeAllocations(participants.length, totalDuration)

  // Generate agenda items
  optimized.push({
    item: 'Introduction & Objectives',
    duration: timeAllocations.introduction,
    presenter: 'Meeting Organizer',
    purpose: 'Set context and expectations'
  })

  if (participants.length > 2) {
    optimized.push({
      item: 'Round-robin Introductions',
      duration: timeAllocations.introductions,
      presenter: 'All Participants',
      purpose: 'Build rapport and understanding'
    })
  }

  optimized.push({
    item: 'Main Discussion: ' + (topic || 'Meeting Topic'),
    duration: timeAllocations.discussion,
    presenter: 'All Participants',
    purpose: 'Address main objectives and topics'
  })

  if (objectives && objectives.length > 0) {
    objectives.forEach((objective: string, index: number) => {
      optimized.push({
        item: `Objective ${index + 1}: ${objective}`,
        duration: Math.max(5, timeAllocations.discussion / objectives.length),
        presenter: 'Relevant Participant',
        purpose: 'Achieve specific meeting goal'
      })
    })
  }

  optimized.push({
    item: 'Action Items & Next Steps',
    duration: timeAllocations.actions,
    presenter: 'All Participants',
    purpose: 'Define follow-up actions and responsibilities'
  })

  optimized.push({
    item: 'Q&A and Closing',
    duration: timeAllocations.closing,
    presenter: 'Meeting Organizer',
    purpose: 'Address remaining questions and summarize'
  })

  return optimized
}

async function optimizeParticipants(meetingData: any) {
  const { participants, objectives } = meetingData

  const optimized = {
    required: [],
    optional: [],
    roles: {},
    preparation: {},
    communication: {}
  }

  // Categorize participants
  for (const participant of participants) {
    const category = await categorizeParticipant(participant, objectives)

    if (category.necessity === 'required') {
      optimized.required.push({
        ...participant,
        role: category.suggestedRole,
        preparation: category.preparationNeeded
      })
    } else {
      optimized.optional.push({
        ...participant,
        role: category.suggestedRole,
        preparation: category.preparationNeeded
      })
    }

    optimized.roles[participant.id] = category.suggestedRole
    optimized.preparation[participant.id] = category.preparationNeeded
  }

  // Optimize communication strategy
  optimized.communication = await optimizeParticipantCommunication(participants)

  return optimized
}

async function generateMeetingRecommendations(meetingData: any, optimized: any) {
  const recommendations = []

  // Duration recommendations
  if (meetingData.duration > 90) {
    recommendations.push('Consider breaking long meetings into shorter sessions')
  }

  // Participant recommendations
  if (optimized.participantOptimization.required.length > 8) {
    recommendations.push('Large participant count detected - consider smaller focused meetings')
  }

  // Agenda recommendations
  const agendaItems = optimized.optimizedAgenda
  const totalAgendaTime = agendaItems.reduce((sum: number, item: any) => sum + item.duration, 0)
  const meetingDuration = meetingData.duration || 60

  if (totalAgendaTime > meetingDuration * 0.9) {
    recommendations.push('Agenda may be too packed - consider prioritizing topics')
  }

  // Preparation recommendations
  recommendations.push('Send agenda and materials 24 hours in advance')
  recommendations.push('Include clear objectives and expected outcomes')

  return recommendations
}

async function predictMeetingOutcomes(meetingData: any, optimized: any) {
  const predictions = {
    successProbability: 0,
    expectedEngagement: '',
    likelyOutcomes: [],
    potentialChallenges: [],
    followUpNeeded: false
  }

  // Calculate success probability
  let successScore = 50

  // Factors affecting success
  if (optimized.optimizedSchedule.confidence > 80) successScore += 15
  if (optimized.participantOptimization.required.length <= 6) successScore += 10
  if (meetingData.objectives && meetingData.objectives.length > 0) successScore += 10
  if (meetingData.preparation && meetingData.preparation.length > 0) successScore += 10

  predictions.successProbability = Math.min(100, successScore)

  // Predict engagement level
  if (successScore > 80) predictions.expectedEngagement = 'High'
  else if (successScore > 60) predictions.expectedEngagement = 'Medium'
  else predictions.expectedEngagement = 'Low'

  // Predict outcomes
  if (meetingData.objectives) {
    predictions.likelyOutcomes = meetingData.objectives.map((obj: string) =>
      `Progress on: ${obj}`
    )
  }

  // Identify potential challenges
  if (optimized.riskFactors.length > 0) {
    predictions.potentialChallenges = optimized.riskFactors.slice(0, 3)
  }

  predictions.followUpNeeded = meetingData.duration > 60 || optimized.participantOptimization.required.length > 4

  return predictions
}

async function identifyMeetingRisks(meetingData: any, optimized: any) {
  const risks = []

  // Scheduling risks
  if (optimized.optimizedSchedule.confidence < 60) {
    risks.push('Low scheduling confidence - participants may have conflicts')
  }

  // Duration risks
  if (meetingData.duration > 120) {
    risks.push('Long meeting duration may lead to fatigue and reduced engagement')
  }

  // Participant risks
  if (optimized.participantOptimization.required.length > 10) {
    risks.push('Large participant count may hinder productive discussion')
  }

  // Preparation risks
  if (!meetingData.agenda) {
    risks.push('No agenda provided - meeting may lack direction')
  }

  // Time zone risks
  const timeZones = meetingData.participants?.map((p: any) => p.timeZone).filter(Boolean) || []
  if (timeZones.length > 1 && new Set(timeZones).size > 1) {
    risks.push('Multiple time zones - consider rotating meeting times')
  }

  return risks
}

// Helper functions
async function analyzeParticipantAvailability(participants: any[]) {
  // Placeholder for availability analysis
  return {
    commonSlots: [
      { date: '2024-01-15', time: '10:00', available: participants.length },
      { date: '2024-01-15', time: '14:00', available: participants.length - 1 },
      { date: '2024-01-16', time: '11:00', available: participants.length }
    ]
  }
}

function findOptimalTimeSlot(availability: any, duration: number, preferredTimes: any) {
  // Find the slot with maximum availability
  let optimal = availability.commonSlots[0]

  for (const slot of availability.commonSlots) {
    if (slot.available > optimal.available) {
      optimal = slot
    }
  }

  return {
    date: optimal.date,
    time: optimal.time,
    alternatives: availability.commonSlots.slice(1, 4)
  }
}

function generateScheduleReasoning(optimalSlot: any, participants: any[]) {
  return `Selected ${optimalSlot.date} at ${optimalSlot.time} based on maximum participant availability (${participants.length} participants can attend)`
}

function calculateScheduleConfidence(optimalSlot: any, participants: any[]) {
  const availabilityRate = optimalSlot.available / participants.length
  return Math.round(availabilityRate * 100)
}

function estimateTimeAllocations(participantCount: number, totalDuration: number) {
  const allocations = {
    introduction: Math.max(5, Math.min(10, totalDuration * 0.1)),
    introductions: participantCount > 2 ? participantCount * 2 : 0,
    discussion: 0,
    actions: Math.max(10, Math.min(15, totalDuration * 0.2)),
    closing: Math.max(5, Math.min(10, totalDuration * 0.1))
  }

  // Calculate discussion time as remainder
  allocations.discussion = totalDuration -
    allocations.introduction -
    allocations.introductions -
    allocations.actions -
    allocations.closing

  return allocations
}

async function categorizeParticipant(participant: any, objectives: any[]) {
  const category = {
    necessity: 'optional',
    suggestedRole: 'Participant',
    preparationNeeded: []
  }

  // Determine necessity based on role and objectives
  if (participant.role === 'decision-maker' || participant.title?.includes('VP') || participant.title?.includes('Director')) {
    category.necessity = 'required'
    category.suggestedRole = 'Decision Maker'
  } else if (participant.expertise && objectives.some((obj: string) => obj.toLowerCase().includes(participant.expertise.toLowerCase()))) {
    category.necessity = 'required'
    category.suggestedRole = 'Subject Matter Expert'
  }

  // Determine preparation needed
  if (objectives && objectives.length > 0) {
    category.preparationNeeded.push('Review meeting objectives')
  }

  if (participant.role === 'presenter') {
    category.preparationNeeded.push('Prepare presentation materials')
    category.suggestedRole = 'Presenter'
  }

  return category
}

async function optimizeParticipantCommunication(participants: any[]) {
  const communication = {
    primaryChannel: 'video',
    backupChannels: ['phone', 'email'],
    materials: [],
    reminders: []
  }

  // Determine best communication method
  const timeZones = participants.map(p => p.timeZone).filter(Boolean)
  if (timeZones.length > 1 && new Set(timeZones).size > 1) {
    communication.primaryChannel = 'async'
    communication.backupChannels = ['email', 'chat']
  }

  // Recommend materials
  communication.materials = [
    'Meeting agenda',
    'Participant list',
    'Background materials'
  ]

  // Set up reminders
  communication.reminders = [
    { timing: '24 hours before', message: 'Meeting reminder with agenda' },
    { timing: '1 hour before', message: 'Final reminder with meeting link' }
  ]

  return communication
}