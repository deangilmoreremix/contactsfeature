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

    const { query, searchType, filters, options } = await req.json()

    const results = await performSemanticSearch(query, searchType, filters, options)

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function performSemanticSearch(query: string, searchType: string, filters: any = {}, options: any = {}) {
  const searchResults = {
    query,
    searchType,
    totalResults: 0,
    results: [],
    facets: {},
    suggestions: [],
    executionTime: 0,
    searchedAt: new Date().toISOString()
  }

  const startTime = Date.now()

  switch (searchType) {
    case 'contacts':
      searchResults.results = await searchContacts(query, filters, options)
      break
    case 'companies':
      searchResults.results = await searchCompanies(query, filters, options)
      break
    case 'conversations':
      searchResults.results = await searchConversations(query, filters, options)
      break
    case 'documents':
      searchResults.results = await searchDocuments(query, filters, options)
      break
    case 'universal':
      searchResults.results = await universalSearch(query, filters, options)
      break
    default:
      searchResults.results = await generalSearch(query, filters, options)
  }

  searchResults.totalResults = searchResults.results.length
  searchResults.facets = generateFacets(searchResults.results)
  searchResults.suggestions = generateSuggestions(query, searchResults.results)
  searchResults.executionTime = Date.now() - startTime

  return searchResults
}

async function searchContacts(query: string, filters: any, options: any) {
  // In a real implementation, this would use vector similarity search
  // For now, we'll simulate semantic search with keyword matching and scoring

  const contacts = await getAllContacts(filters)
  const results = []

  for (const contact of contacts) {
    const score = calculateSemanticSimilarity(query, contact)
    if (score > (options.threshold || 0.3)) {
      results.push({
        id: contact.id,
        type: 'contact',
        title: contact.name,
        subtitle: contact.company || contact.email,
        content: contact.notes || '',
        score,
        highlights: findHighlights(query, contact),
        metadata: {
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          lastContact: contact.lastContactedAt
        }
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 20)
}

async function searchCompanies(query: string, filters: any, options: any) {
  const companies = await getAllCompanies(filters)
  const results = []

  for (const company of companies) {
    const score = calculateSemanticSimilarity(query, company)
    if (score > (options.threshold || 0.3)) {
      results.push({
        id: company.id,
        type: 'company',
        title: company.name,
        subtitle: `${company.industry || 'Unknown Industry'} • ${company.size || 'Unknown Size'}`,
        content: company.description || '',
        score,
        highlights: findHighlights(query, company),
        metadata: {
          website: company.website,
          location: company.location,
          industry: company.industry,
          size: company.size
        }
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 20)
}

async function searchConversations(query: string, filters: any, options: any) {
  const conversations = await getAllConversations(filters)
  const results = []

  for (const conversation of conversations) {
    const score = calculateSemanticSimilarity(query, conversation)
    if (score > (options.threshold || 0.3)) {
      results.push({
        id: conversation.id,
        type: 'conversation',
        title: conversation.subject || 'Conversation',
        subtitle: `with ${conversation.contactName} • ${formatDate(conversation.date)}`,
        content: conversation.content || conversation.snippet || '',
        score,
        highlights: findHighlights(query, conversation),
        metadata: {
          contactId: conversation.contactId,
          contactName: conversation.contactName,
          date: conversation.date,
          channel: conversation.channel,
          sentiment: conversation.sentiment
        }
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 20)
}

async function searchDocuments(query: string, filters: any, options: any) {
  const documents = await getAllDocuments(filters)
  const results = []

  for (const document of documents) {
    const score = calculateSemanticSimilarity(query, document)
    if (score > (options.threshold || 0.3)) {
      results.push({
        id: document.id,
        type: 'document',
        title: document.title,
        subtitle: `${document.type} • ${formatDate(document.createdAt)}`,
        content: document.content || document.excerpt || '',
        score,
        highlights: findHighlights(query, document),
        metadata: {
          type: document.type,
          size: document.size,
          createdAt: document.createdAt,
          author: document.author
        }
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 20)
}

async function universalSearch(query: string, filters: any, options: any) {
  const [contacts, companies, conversations, documents] = await Promise.all([
    searchContacts(query, filters, { ...options, limit: 5 }),
    searchCompanies(query, filters, { ...options, limit: 5 }),
    searchConversations(query, filters, { ...options, limit: 5 }),
    searchDocuments(query, filters, { ...options, limit: 5 })
  ])

  return [...contacts, ...companies, ...conversations, ...documents]
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit || 20)
}

async function generalSearch(query: string, filters: any, options: any) {
  // Fallback to universal search
  return await universalSearch(query, filters, options)
}

function calculateSemanticSimilarity(query: string, item: any): number {
  // Simple semantic similarity calculation
  // In production, this would use embeddings and vector similarity

  const queryWords = query.toLowerCase().split(/\s+/)
  const searchableText = getSearchableText(item).toLowerCase()

  let score = 0
  let matches = 0

  // Exact phrase match gets highest score
  if (searchableText.includes(query.toLowerCase())) {
    score += 1.0
    matches++
  }

  // Individual word matches
  for (const word of queryWords) {
    if (word.length > 2) { // Ignore very short words
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      if (regex.test(searchableText)) {
        score += 0.5
        matches++
      }
    }
  }

  // Fuzzy matching for typos
  for (const word of queryWords) {
    if (word.length > 4) {
      const fuzzyMatches = findFuzzyMatches(word, searchableText)
      if (fuzzyMatches.length > 0) {
        score += 0.3
        matches++
      }
    }
  }

  // Boost score for matches in important fields
  if (item.name && queryWords.some(word => item.name.toLowerCase().includes(word))) {
    score += 0.2
  }

  if (item.title && queryWords.some(word => item.title.toLowerCase().includes(word))) {
    score += 0.2
  }

  // Normalize score
  return Math.min(1.0, score)
}

function getSearchableText(item: any): string {
  const fields = ['name', 'title', 'content', 'description', 'notes', 'company', 'email', 'tags']
  const textParts = []

  for (const field of fields) {
    if (item[field]) {
      textParts.push(String(item[field]))
    }
  }

  return textParts.join(' ')
}

function findHighlights(query: string, item: any): any[] {
  const highlights = []
  const searchableText = getSearchableText(item)
  const queryWords = query.toLowerCase().split(/\s+/)

  for (const word of queryWords) {
    const index = searchableText.toLowerCase().indexOf(word)
    if (index !== -1) {
      highlights.push({
        text: searchableText.substr(Math.max(0, index - 20), 40),
        start: Math.max(0, index - 20),
        end: Math.min(searchableText.length, index + word.length + 20)
      })
    }
  }

  return highlights
}

function findFuzzyMatches(word: string, text: string): string[] {
  const matches = []
  const words = text.split(/\s+/)

  for (const textWord of words) {
    if (calculateLevenshteinDistance(word, textWord) <= 2) {
      matches.push(textWord)
    }
  }

  return matches
}

function calculateLevenshteinDistance(str1: string, str2: string): number {
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

function generateFacets(results: any[]): any {
  const facets = {
    types: {},
    dates: {},
    scores: { high: 0, medium: 0, low: 0 }
  }

  for (const result of results) {
    // Type facet
    facets.types[result.type] = (facets.types[result.type] || 0) + 1

    // Score facet
    if (result.score > 0.7) facets.scores.high++
    else if (result.score > 0.4) facets.scores.medium++
    else facets.scores.low++

    // Date facet (if available)
    if (result.metadata?.createdAt || result.metadata?.date) {
      const date = new Date(result.metadata.createdAt || result.metadata.date)
      const month = date.toISOString().substring(0, 7) // YYYY-MM
      facets.dates[month] = (facets.dates[month] || 0) + 1
    }
  }

  return facets
}

function generateSuggestions(query: string, results: any[]): string[] {
  const suggestions = []

  if (results.length === 0) {
    suggestions.push('Try using different keywords')
    suggestions.push('Check spelling')
    suggestions.push('Use broader search terms')
  } else if (results.length < 5) {
    suggestions.push('Try using synonyms')
    suggestions.push('Use more specific terms')
  }

  // Add related terms based on successful results
  if (results.length > 0) {
    const topResult = results[0]
    if (topResult.type === 'contact') {
      suggestions.push('Search for related companies')
      suggestions.push('Look for conversation history')
    } else if (topResult.type === 'company') {
      suggestions.push('Find contacts at this company')
      suggestions.push('Search for related documents')
    }
  }

  return suggestions
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return 'Unknown date'
  }
}

// Placeholder functions for data retrieval
async function getAllContacts(filters: any): Promise<any[]> {
  // In production, this would query the database
  return []
}

async function getAllCompanies(filters: any): Promise<any[]> {
  // In production, this would query the database
  return []
}

async function getAllConversations(filters: any): Promise<any[]> {
  // In production, this would query the database
  return []
}

async function getAllDocuments(filters: any): Promise<any[]> {
  // In production, this would query the database
  return []
}