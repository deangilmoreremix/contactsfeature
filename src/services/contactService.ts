import { supabase } from './supabaseClient'
import { Contact } from '../types/contact'

export class ContactService {
  private static instance: ContactService

  static getInstance(): ContactService {
    if (!ContactService.instance) {
      ContactService.instance = new ContactService()
    }
    return ContactService.instance
  }

  // Create a new contact
  async createContact(contactData: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert([contactData])
      .select()
      .single()

    if (error) {
      console.error('Error creating contact:', error)
      throw error
    }

    return data
  }

  // Get all contacts for the current user
  async getContacts(): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
      throw error
    }

    return data || []
  }

  // Get a single contact by ID
  async getContactById(id: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Contact not found
      }
      console.error('Error fetching contact:', error)
      throw error
    }

    return data
  }

  // Update a contact
  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      throw error
    }

    return data
  }

  // Delete a contact
  async deleteContact(id: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting contact:', error)
      throw error
    }
  }

  // Search contacts
  async searchContacts(query: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      .order('name')

    if (error) {
      console.error('Error searching contacts:', error)
      throw error
    }

    return data || []
  }

  // Get contacts by category
  async getContactsByCategory(category: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts by category:', error)
      throw error
    }

    return data || []
  }

  // Get contacts by status
  async getContactsByStatus(status: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts by status:', error)
      throw error
    }

    return data || []
  }

  // Bulk update contacts
  async bulkUpdateContacts(contactIds: string[], updates: Partial<Contact>): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .in('id', contactIds)

    if (error) {
      console.error('Error bulk updating contacts:', error)
      throw error
    }
  }

  // Add activity to contact
  async addContactActivity(contactId: string, activityType: string, description: string, metadata: any = {}): Promise<void> {
    const { error } = await supabase
      .from('contact_activities')
      .insert([{
        contact_id: contactId,
        activity_type: activityType,
        description,
        metadata
      }])

    if (error) {
      console.error('Error adding contact activity:', error)
      throw error
    }
  }

  // Get contact activities
  async getContactActivities(contactId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('contact_activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contact activities:', error)
      throw error
    }

    return data || []
  }

  // Validate contact data
  validateContactData(contactData: Partial<Contact>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!contactData.name || contactData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long')
    }

    if (contactData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      errors.push('Invalid email format')
    }

    if (contactData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(contactData.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Invalid phone number format')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Enrich contact data using AI
  async enrichContactData(contactId: string): Promise<Contact> {
    const contact = await this.getContactById(contactId)
    if (!contact) {
      throw new Error('Contact not found')
    }

    try {
      // Call AI enrichment Edge Function
      const { data: enrichedData, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          contactData: contact,
          enrichmentType: 'comprehensive'
        }
      })

      if (error) throw error

      // Update contact with enriched data
      const updates: Partial<Contact> = {}

      if (enrichedData.phone && !contact.phone) {
        updates.phone = enrichedData.phone
      }

      if (enrichedData.industry && !contact.industry) {
        updates.industry = enrichedData.industry
      }

      if (enrichedData.socialProfiles) {
        updates.socialProfiles = {
          ...contact.socialProfiles,
          ...enrichedData.socialProfiles
        }
      }

      if (Object.keys(updates).length > 0) {
        return await this.updateContact(contactId, updates)
      }

      return contact
    } catch (error) {
      console.error('Error enriching contact data:', error)
      throw error
    }
  }

  // Calculate contact score
  async calculateContactScore(contactId: string): Promise<number> {
    const contact = await this.getContactById(contactId)
    if (!contact) {
      throw new Error('Contact not found')
    }

    try {
      const { data: scoreData, error } = await supabase.functions.invoke('smart-score', {
        body: {
          contactData: contact,
          scoringCriteria: {}
        }
      })

      if (error) throw error

      // Update contact score in database
      await this.updateContact(contactId, { score: scoreData.totalScore })

      return scoreData.totalScore
    } catch (error) {
      console.error('Error calculating contact score:', error)
      throw error
    }
  }

  // Export contacts
  async exportContacts(format: 'csv' | 'json' = 'csv'): Promise<string> {
    const contacts = await this.getContacts()

    if (format === 'json') {
      return JSON.stringify(contacts, null, 2)
    }

    // Convert to CSV
    if (contacts.length === 0) return ''

    const headers = Object.keys(contacts[0]).join(',')
    const rows = contacts.map(contact =>
      Object.values(contact).map(value =>
        typeof value === 'object' ? JSON.stringify(value) : String(value || '')
      ).join(',')
    )

    return [headers, ...rows].join('\n')
  }

  // Import contacts
  async importContacts(csvData: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const lines = csvData.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim())
        const contactData: any = {}

        headers.forEach((header, index) => {
          let value = values[index] || ''

          // Parse JSON fields
          if (['socialProfiles', 'customFields', 'tags'].includes(header)) {
            try {
              value = value ? JSON.parse(value) : null
            } catch {
              value = null
            }
          }

          // Parse boolean fields
          if (['priority', 'isFavorite'].includes(header)) {
            value = value.toLowerCase() === 'true'
          }

          // Parse number fields
          if (['score', 'engagementScore'].includes(header)) {
            value = value ? parseInt(value, 10) : 0
          }

          contactData[header] = value
        })

        // Validate required fields
        if (!contactData.name) {
          results.errors.push(`Row ${i + 1}: Missing required field 'name'`)
          results.failed++
          continue
        }

        // Create contact
        await this.createContact(contactData)
        results.success++
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error.message}`)
        results.failed++
      }
    }

    return results
  }
}

export const contactService = ContactService.getInstance()