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

    const { contacts, threshold, detectionType } = await req.json()

    const duplicates = await detectDuplicates(contacts, threshold || 0.8, detectionType)

    return new Response(JSON.stringify(duplicates), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function detectDuplicates(contacts: any[], threshold: number, detectionType: string) {
  const duplicates = {
    groups: [],
    summary: {
      totalContacts: contacts.length,
      duplicateGroups: 0,
      totalDuplicates: 0,
      uniqueContacts: 0
    },
    analysis: {},
    recommendations: []
  }

  switch (detectionType) {
    case 'email':
      duplicates.groups = await detectEmailDuplicates(contacts, threshold)
      break
    case 'name':
      duplicates.groups = await detectNameDuplicates(contacts, threshold)
      break
    case 'phone':
      duplicates.groups = await detectPhoneDuplicates(contacts, threshold)
      break
    case 'comprehensive':
      duplicates.groups = await detectComprehensiveDuplicates(contacts, threshold)
      break
    default:
      duplicates.groups = await detectComprehensiveDuplicates(contacts, threshold)
  }

  // Calculate summary
  duplicates.summary.duplicateGroups = duplicates.groups.length
  duplicates.summary.totalDuplicates = duplicates.groups.reduce((sum, group) => sum + group.duplicates.length, 0)
  duplicates.summary.uniqueContacts = contacts.length - duplicates.summary.totalDuplicates

  // Generate analysis
  duplicates.analysis = await analyzeDuplicates(duplicates.groups)

  // Generate recommendations
  duplicates.recommendations = await generateDuplicateRecommendations(duplicates.groups)

  return duplicates
}

async function detectEmailDuplicates(contacts: any[], threshold: number) {
  const groups = []
  const processed = new Set()

  for (let i = 0; i < contacts.length; i++) {
    if (processed.has(i)) continue

    const contact = contacts[i]
    if (!contact.email) continue

    const group = {
      master: contact,
      duplicates: [],
      similarity: 1,
      matchReason: 'exact_email_match'
    }

    for (let j = i + 1; j < contacts.length; j++) {
      if (processed.has(j)) continue

      const otherContact = contacts[j]
      if (!otherContact.email) continue

      const similarity = calculateEmailSimilarity(contact.email, otherContact.email)
      if (similarity >= threshold) {
        group.duplicates.push({
          contact: otherContact,
          similarity: similarity,
          matchReason: similarity === 1 ? 'exact_match' : 'similar_email'
        })
        processed.add(j)
      }
    }

    if (group.duplicates.length > 0) {
      groups.push(group)
      processed.add(i)
    }
  }

  return groups
}

async function detectNameDuplicates(contacts: any[], threshold: number) {
  const groups = []
  const processed = new Set()

  for (let i = 0; i < contacts.length; i++) {
    if (processed.has(i)) continue

    const contact = contacts[i]
    const name = contact.name || contact.firstName + ' ' + contact.lastName
    if (!name) continue

    const group = {
      master: contact,
      duplicates: [],
      similarity: 1,
      matchReason: 'exact_name_match'
    }

    for (let j = i + 1; j < contacts.length; j++) {
      if (processed.has(j)) continue

      const otherContact = contacts[j]
      const otherName = otherContact.name || otherContact.firstName + ' ' + otherContact.lastName
      if (!otherName) continue

      const similarity = calculateNameSimilarity(name, otherName)
      if (similarity >= threshold) {
        group.duplicates.push({
          contact: otherContact,
          similarity: similarity,
          matchReason: similarity === 1 ? 'exact_match' : 'similar_name'
        })
        processed.add(j)
      }
    }

    if (group.duplicates.length > 0) {
      groups.push(group)
      processed.add(i)
    }
  }

  return groups
}

async function detectPhoneDuplicates(contacts: any[], threshold: number) {
  const groups = []
  const processed = new Set()

  for (let i = 0; i < contacts.length; i++) {
    if (processed.has(i)) continue

    const contact = contacts[i]
    if (!contact.phone) continue

    const group = {
      master: contact,
      duplicates: [],
      similarity: 1,
      matchReason: 'exact_phone_match'
    }

    for (let j = i + 1; j < contacts.length; j++) {
      if (processed.has(j)) continue

      const otherContact = contacts[j]
      if (!otherContact.phone) continue

      const similarity = calculatePhoneSimilarity(contact.phone, otherContact.phone)
      if (similarity >= threshold) {
        group.duplicates.push({
          contact: otherContact,
          similarity: similarity,
          matchReason: similarity === 1 ? 'exact_match' : 'similar_phone'
        })
        processed.add(j)
      }
    }

    if (group.duplicates.length > 0) {
      groups.push(group)
      processed.add(i)
    }
  }

  return groups
}

async function detectComprehensiveDuplicates(contacts: any[], threshold: number) {
  const groups = []
  const processed = new Set()

  for (let i = 0; i < contacts.length; i++) {
    if (processed.has(i)) continue

    const contact = contacts[i]
    const group = {
      master: contact,
      duplicates: [],
      similarity: 0,
      matchReason: 'multiple_criteria'
    }

    let maxSimilarity = 0

    for (let j = i + 1; j < contacts.length; j++) {
      if (processed.has(j)) continue

      const otherContact = contacts[j]
      const similarity = calculateComprehensiveSimilarity(contact, otherContact)

      if (similarity >= threshold) {
        group.duplicates.push({
          contact: otherContact,
          similarity: similarity,
          matchReason: getMatchReason(contact, otherContact, similarity)
        })
        processed.add(j)
        maxSimilarity = Math.max(maxSimilarity, similarity)
      }
    }

    if (group.duplicates.length > 0) {
      group.similarity = maxSimilarity
      groups.push(group)
      processed.add(i)
    }
  }

  return groups
}

async function analyzeDuplicates(groups: any[]) {
  const analysis = {
    duplicateRate: 0,
    averageGroupSize: 0,
    mostCommonMatchReason: '',
    dataQuality: '',
    recommendations: []
  }

  if (groups.length === 0) {
    analysis.dataQuality = 'excellent'
    analysis.recommendations.push('No duplicates found - data quality is good')
    return analysis
  }

  // Calculate duplicate rate
  const totalContacts = groups.reduce((sum, group) => sum + group.duplicates.length + 1, 0)
  analysis.duplicateRate = (groups.length / totalContacts) * 100

  // Calculate average group size
  const totalDuplicates = groups.reduce((sum, group) => sum + group.duplicates.length, 0)
  analysis.averageGroupSize = totalDuplicates / groups.length

  // Find most common match reason
  const reasons = groups.map(group => group.matchReason)
  analysis.mostCommonMatchReason = reasons.reduce((a, b, i, arr) =>
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  )

  // Assess data quality
  if (analysis.duplicateRate < 5) {
    analysis.dataQuality = 'good'
  } else if (analysis.duplicateRate < 15) {
    analysis.dataQuality = 'fair'
  } else {
    analysis.dataQuality = 'poor'
  }

  return analysis
}

async function generateDuplicateRecommendations(groups: any[]) {
  const recommendations = []

  if (groups.length === 0) {
    return ['Data appears to be clean with no duplicates detected']
  }

  const analysis = await analyzeDuplicates(groups)

  if (analysis.duplicateRate > 20) {
    recommendations.push('High duplicate rate detected - implement stricter data validation')
  }

  if (analysis.mostCommonMatchReason === 'exact_email_match') {
    recommendations.push('Implement email uniqueness constraint at database level')
  }

  if (analysis.averageGroupSize > 3) {
    recommendations.push('Large duplicate groups found - review data import processes')
  }

  recommendations.push(`Merge ${groups.length} duplicate groups to improve data quality`)
  recommendations.push('Set up automated duplicate detection for new records')

  return recommendations
}

// Helper functions
function calculateEmailSimilarity(email1: string, email2: string): number {
  if (email1 === email2) return 1

  // Check for common variations
  const normalizeEmail = (email: string) => email.toLowerCase().replace(/\+.*@/, '@')
  const normalized1 = normalizeEmail(email1)
  const normalized2 = normalizeEmail(email2)

  if (normalized1 === normalized2) return 0.9

  // Check domain similarity
  const domain1 = email1.split('@')[1]
  const domain2 = email2.split('@')[1]

  if (domain1 === domain2) {
    // Same domain, different local part
    return 0.7
  }

  // Check for typos in domain
  if (calculateStringSimilarity(domain1, domain2) > 0.8) {
    return 0.6
  }

  return 0
}

function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0

  const normalized1 = normalizeName(name1)
  const normalized2 = normalizeName(name2)

  if (normalized1 === normalized2) return 1

  // Check for name variations
  const parts1 = normalized1.split(' ')
  const parts2 = normalized2.split(' ')

  if (parts1.length === parts2.length) {
    let matchingParts = 0
    for (const part1 of parts1) {
      for (const part2 of parts2) {
        if (calculateStringSimilarity(part1, part2) > 0.8) {
          matchingParts++
          break
        }
      }
    }
    return matchingParts / parts1.length
  }

  return calculateStringSimilarity(normalized1, normalized2)
}

function calculatePhoneSimilarity(phone1: string, phone2: string): number {
  if (!phone1 || !phone2) return 0

  // Normalize phone numbers
  const normalized1 = phone1.replace(/\D/g, '')
  const normalized2 = phone2.replace(/\D/g, '')

  if (normalized1 === normalized2) return 1

  // Check for different formats of same number
  if (normalized1.length === 10 && normalized2.length === 10) {
    return 0.9 // Assume same if same digits
  }

  if (normalized1.length === 11 && normalized2.length === 11 &&
      normalized1.substring(1) === normalized2.substring(1)) {
    return 0.9 // Same number with different country codes
  }

  return 0
}

function calculateComprehensiveSimilarity(contact1: any, contact2: any): number {
  let similarity = 0
  let criteriaCount = 0

  // Email similarity
  if (contact1.email && contact2.email) {
    similarity += calculateEmailSimilarity(contact1.email, contact2.email)
    criteriaCount++
  }

  // Name similarity
  const name1 = contact1.name || `${contact1.firstName} ${contact1.lastName}`
  const name2 = contact2.name || `${contact2.firstName} ${contact2.lastName}`
  if (name1 && name2) {
    similarity += calculateNameSimilarity(name1, name2)
    criteriaCount++
  }

  // Phone similarity
  if (contact1.phone && contact2.phone) {
    similarity += calculatePhoneSimilarity(contact1.phone, contact2.phone)
    criteriaCount++
  }

  // Company similarity
  if (contact1.company && contact2.company) {
    similarity += calculateStringSimilarity(contact1.company, contact2.company)
    criteriaCount++
  }

  return criteriaCount > 0 ? similarity / criteriaCount : 0
}

function getMatchReason(contact1: any, contact2: any, similarity: number): string {
  if (contact1.email === contact2.email) return 'exact_email_match'
  if (contact1.phone === contact2.phone) return 'exact_phone_match'

  const name1 = contact1.name || `${contact1.firstName} ${contact1.lastName}`
  const name2 = contact2.name || `${contact2.firstName} ${contact2.lastName}`
  if (name1 === name2) return 'exact_name_match'

  if (similarity > 0.8) return 'high_similarity'
  if (similarity > 0.6) return 'medium_similarity'
  return 'low_similarity'
}

function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1

  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

function normalizeName(name: string): string {
  return name.toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z\s]/g, '')
}