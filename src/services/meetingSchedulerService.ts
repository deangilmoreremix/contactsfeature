/**
 * Advanced Meeting Scheduling Service
 * Intelligent meeting scheduling with calendar integration and conflict resolution
 */

export interface MeetingParticipant {
  id: string;
  name: string;
  email: string;
  availability?: TimeSlot[];
  timezone: string;
  role: 'organizer' | 'required' | 'optional';
  response?: 'accepted' | 'declined' | 'tentative' | 'pending';
}

export interface TimeSlot {
  start: string; // ISO datetime
  end: string;   // ISO datetime
  available: boolean;
  confidence?: number; // AI confidence score for availability
}

export interface MeetingRequest {
  title: string;
  description?: string;
  duration: number; // minutes
  participants: MeetingParticipant[];
  preferredTimeRange?: {
    start: string;
    end: string;
  };
  location?: 'in-person' | 'video' | 'phone';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  bufferTime?: number; // minutes before/after meeting
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
    count?: number;
  };
}

export interface ScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  participants: MeetingParticipant[];
  organizer: MeetingParticipant;
  location?: string;
  meetingUrl?: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recurrence?: any;
  createdAt: string;
  updatedAt: string;
  reminders: MeetingReminder[];
  notes?: string;
}

export interface MeetingReminder {
  id: string;
  type: 'email' | 'sms' | 'notification';
  minutesBefore: number;
  sent: boolean;
  sentAt?: string;
}

export interface AvailabilityAnalysis {
  participantId: string;
  availableSlots: TimeSlot[];
  conflicts: TimeSlot[];
  preferredTimes: TimeSlot[];
  timezone: string;
  workHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    days: number[]; // 0-6, Sunday = 0
  };
}

export class MeetingSchedulerService {
  private static instance: MeetingSchedulerService;
  private meetings: Map<string, ScheduledMeeting> = new Map();
  private availabilityCache: Map<string, AvailabilityAnalysis> = new Map();

  static getInstance(): MeetingSchedulerService {
    if (!MeetingSchedulerService.instance) {
      MeetingSchedulerService.instance = new MeetingSchedulerService();
    }
    return MeetingSchedulerService.instance;
  }

  /**
   * Find optimal meeting time for all participants
   */
  async findOptimalTime(request: MeetingRequest): Promise<{
    suggestedSlots: TimeSlot[];
    participantAvailability: AvailabilityAnalysis[];
    confidence: number;
    reasoning: string[];
  }> {
    // Analyze availability for all participants
    const availabilityAnalyses = await Promise.all(
      request.participants.map(participant => this.analyzeAvailability(participant, request))
    );

    // Find common available time slots
    const commonSlots = this.findCommonAvailableSlots(
      availabilityAnalyses,
      request.duration,
      request.preferredTimeRange
    );

    // Score and rank time slots
    const scoredSlots = this.scoreTimeSlots(commonSlots, availabilityAnalyses, request);

    // Return top suggestions
    const suggestedSlots = scoredSlots
      .sort((a, b) => b.confidence! - a.confidence!)
      .slice(0, 5);

    const overallConfidence = suggestedSlots.length > 0 ?
      suggestedSlots.reduce((sum, slot) => sum + (slot.confidence || 0), 0) / suggestedSlots.length : 0;

    const reasoning = this.generateSchedulingReasoning(suggestedSlots, availabilityAnalyses, request);

    return {
      suggestedSlots,
      participantAvailability: availabilityAnalyses,
      confidence: overallConfidence,
      reasoning
    };
  }

  /**
   * Analyze participant availability
   */
  private async analyzeAvailability(
    participant: MeetingParticipant,
    request: MeetingRequest
  ): Promise<AvailabilityAnalysis> {
    // Check cache first
    const cacheKey = `${participant.id}_${request.preferredTimeRange?.start || 'default'}`;
    const cached = this.availabilityCache.get(cacheKey);
    if (cached) return cached;

    // In a real implementation, this would integrate with calendar APIs
    // For demo purposes, we'll simulate availability analysis

    const analysis: AvailabilityAnalysis = {
      participantId: participant.id,
      availableSlots: [],
      conflicts: [],
      preferredTimes: [],
      timezone: participant.timezone,
      workHours: {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5] // Monday to Friday
      }
    };

    // Generate mock availability data
    const startDate = request.preferredTimeRange?.start ?
      new Date(request.preferredTimeRange.start) : new Date();
    const endDate = request.preferredTimeRange?.end ?
      new Date(request.preferredTimeRange.end) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();

      // Skip weekends unless specified
      if (!analysis.workHours.days.includes(dayOfWeek)) continue;

      // Generate time slots during work hours
      const [startHour, startMinute] = analysis.workHours.start.split(':').map(Number);
      const [endHour, endMinute] = analysis.workHours.end.split(':').map(Number);

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) { // 30-minute slots
          const slotStart = new Date(date);
          slotStart.setHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + 30);

          // Randomly mark some slots as available (70% availability for demo)
          const isAvailable = Math.random() > 0.3;

          const slot: TimeSlot = {
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available: isAvailable,
            confidence: isAvailable ? Math.random() * 0.5 + 0.5 : 0 // 0.5-1.0 for available
          };

          if (isAvailable) {
            analysis.availableSlots.push(slot);
          } else {
            analysis.conflicts.push(slot);
          }
        }
      }
    }

    // Identify preferred times (mornings for high priority, afternoons for low priority)
    const preferredSlots = analysis.availableSlots.filter(slot => {
      const hour = new Date(slot.start).getHours();
      if (request.priority === 'high' || request.priority === 'urgent') {
        return hour >= 9 && hour <= 11; // Morning meetings for important topics
      } else {
        return hour >= 14 && hour <= 16; // Afternoon meetings for less urgent topics
      }
    });

    analysis.preferredTimes = preferredSlots.slice(0, 10);

    // Cache the analysis
    this.availabilityCache.set(cacheKey, analysis);

    return analysis;
  }

  /**
   * Find common available time slots for all participants
   */
  private findCommonAvailableSlots(
    availabilityAnalyses: AvailabilityAnalysis[],
    duration: number,
    timeRange?: { start: string; end: string }
  ): TimeSlot[] {
    if (availabilityAnalyses.length === 0) return [];

    // Start with the first participant's available slots
    let commonSlots = availabilityAnalyses[0].availableSlots;

    // Find intersection with other participants' availability
    for (let i = 1; i < availabilityAnalyses.length; i++) {
      const participantSlots = availabilityAnalyses[i].availableSlots;
      commonSlots = commonSlots.filter(slot1 =>
        participantSlots.some(slot2 =>
          slot1.start === slot2.start && slot1.end === slot2.end
        )
      );
    }

    // Filter by time range if specified
    if (timeRange) {
      commonSlots = commonSlots.filter(slot =>
        slot.start >= timeRange.start && slot.end <= timeRange.end
      );
    }

    // Group consecutive slots to accommodate meeting duration
    const meetingSlots: TimeSlot[] = [];
    const slotDuration = 30; // minutes per slot
    const requiredSlots = Math.ceil(duration / slotDuration);

    for (let i = 0; i <= commonSlots.length - requiredSlots; i++) {
      const consecutiveSlots = commonSlots.slice(i, i + requiredSlots);

      // Check if slots are consecutive
      let isConsecutive = true;
      for (let j = 1; j < consecutiveSlots.length; j++) {
        const prevEnd = new Date(consecutiveSlots[j - 1].end);
        const currentStart = new Date(consecutiveSlots[j].start);
        if (currentStart.getTime() !== prevEnd.getTime()) {
          isConsecutive = false;
          break;
        }
      }

      if (isConsecutive) {
        meetingSlots.push({
          start: consecutiveSlots[0].start,
          end: consecutiveSlots[consecutiveSlots.length - 1].end,
          available: true,
          confidence: consecutiveSlots.reduce((sum, slot) => sum + (slot.confidence || 0), 0) / consecutiveSlots.length
        });
      }
    }

    return meetingSlots;
  }

  /**
   * Score time slots based on various factors
   */
  private scoreTimeSlots(
    slots: TimeSlot[],
    availabilityAnalyses: AvailabilityAnalysis[],
    request: MeetingRequest
  ): TimeSlot[] {
    return slots.map(slot => {
      let score = 0;
      const reasoning: string[] = [];

      // Base score from availability confidence
      score += (slot.confidence || 0) * 40;
      reasoning.push(`Availability confidence: ${(slot.confidence || 0) * 100}%`);

      // Prefer times within preferred ranges
      const slotTime = new Date(slot.start);
      const hour = slotTime.getHours();
      const day = slotTime.getDay();

      // Business hours preference (9 AM - 5 PM)
      if (hour >= 9 && hour <= 17) {
        score += 20;
        reasoning.push('Within standard business hours');
      }

      // Avoid Mondays and Fridays if possible
      if (day !== 1 && day !== 5) {
        score += 10;
        reasoning.push('Mid-week scheduling');
      }

      // Priority-based time preferences
      if (request.priority === 'high' || request.priority === 'urgent') {
        if (hour >= 9 && hour <= 11) {
          score += 15;
          reasoning.push('Morning slot for high-priority meeting');
        }
      } else {
        if (hour >= 14 && hour <= 16) {
          score += 15;
          reasoning.push('Afternoon slot for regular priority meeting');
        }
      }

      // Participant preferences
      const preferredCount = availabilityAnalyses.filter(analysis =>
        analysis.preferredTimes.some(preferred =>
          preferred.start === slot.start
        )
      ).length;

      if (preferredCount > 0) {
        score += (preferredCount / availabilityAnalyses.length) * 15;
        reasoning.push(`${preferredCount} participants prefer this time`);
      }

      return {
        ...slot,
        confidence: Math.min(100, score) / 100 // Normalize to 0-1
      };
    });
  }

  /**
   * Generate reasoning for scheduling recommendations
   */
  private generateSchedulingReasoning(
    suggestedSlots: TimeSlot[],
    availabilityAnalyses: AvailabilityAnalysis[],
    request: MeetingRequest
  ): string[] {
    const reasoning: string[] = [];

    if (suggestedSlots.length === 0) {
      reasoning.push('No common available time slots found for all participants');
      reasoning.push('Consider reducing the number of required participants or extending the time range');
      return reasoning;
    }

    reasoning.push(`Found ${suggestedSlots.length} optimal time slots for ${request.participants.length} participants`);

    const avgAvailability = availabilityAnalyses.reduce((sum, analysis) =>
      sum + analysis.availableSlots.length, 0
    ) / availabilityAnalyses.length;

    reasoning.push(`Average participant availability: ${Math.round(avgAvailability)} time slots`);

    if (request.priority === 'high' || request.priority === 'urgent') {
      reasoning.push('Prioritized morning time slots for high-priority meeting');
    }

    const conflicts = availabilityAnalyses.reduce((sum, analysis) =>
      sum + analysis.conflicts.length, 0
    );

    if (conflicts > 0) {
      reasoning.push(`${conflicts} scheduling conflicts identified and avoided`);
    }

    return reasoning;
  }

  /**
   * Schedule a meeting with optimal time
   */
  async scheduleMeeting(request: MeetingRequest, selectedTime?: TimeSlot): Promise<ScheduledMeeting> {
    let meetingTime: TimeSlot;

    if (selectedTime) {
      meetingTime = selectedTime;
    } else {
      // Find optimal time automatically
      const result = await this.findOptimalTime(request);
      if (result.suggestedSlots.length === 0) {
        throw new Error('No suitable meeting time found');
      }
      meetingTime = result.suggestedSlots[0];
    }

    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const organizer = request.participants.find(p => p.role === 'organizer') || request.participants[0];

    const meeting: ScheduledMeeting = {
      id: meetingId,
      title: request.title,
      description: request.description,
      startTime: meetingTime.start,
      endTime: meetingTime.end,
      duration: request.duration,
      participants: request.participants,
      organizer,
      location: request.location === 'video' ? 'Video Call' : request.location === 'phone' ? 'Phone Call' : 'In-Person',
      status: 'scheduled',
      priority: request.priority,
      recurrence: request.recurrence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reminders: this.generateDefaultReminders(request.priority),
      notes: ''
    };

    // Generate meeting URL for video calls
    if (request.location === 'video') {
      meeting.meetingUrl = `https://meet.example.com/${meetingId}`;
    }

    this.meetings.set(meetingId, meeting);

    // Schedule reminders
    this.scheduleReminders(meeting);

    return meeting;
  }

  /**
   * Generate default reminders based on priority
   */
  private generateDefaultReminders(priority: string): MeetingReminder[] {
    const reminders: MeetingReminder[] = [];

    switch (priority) {
      case 'urgent':
        reminders.push(
          { id: 'reminder_1', type: 'notification', minutesBefore: 15, sent: false },
          { id: 'reminder_2', type: 'email', minutesBefore: 60, sent: false },
          { id: 'reminder_3', type: 'sms', minutesBefore: 15, sent: false }
        );
        break;
      case 'high':
        reminders.push(
          { id: 'reminder_1', type: 'notification', minutesBefore: 15, sent: false },
          { id: 'reminder_2', type: 'email', minutesBefore: 60, sent: false }
        );
        break;
      case 'medium':
        reminders.push(
          { id: 'reminder_1', type: 'email', minutesBefore: 1440, sent: false }, // 24 hours
          { id: 'reminder_2', type: 'notification', minutesBefore: 60, sent: false }
        );
        break;
      default: // low
        reminders.push(
          { id: 'reminder_1', type: 'email', minutesBefore: 1440, sent: false }
        );
    }

    return reminders;
  }

  /**
   * Schedule reminders for a meeting
   */
  private scheduleReminders(meeting: ScheduledMeeting): void {
    const meetingTime = new Date(meeting.startTime);

    meeting.reminders.forEach(reminder => {
      const reminderTime = new Date(meetingTime.getTime() - reminder.minutesBefore * 60 * 1000);

      if (reminderTime > new Date()) {
        setTimeout(() => {
          this.sendReminder(meeting, reminder);
        }, reminderTime.getTime() - Date.now());
      }
    });
  }

  /**
   * Send a reminder
   */
  private async sendReminder(meeting: ScheduledMeeting, reminder: MeetingReminder): Promise<void> {
    // In a real implementation, this would send actual notifications
    console.log(`Sending ${reminder.type} reminder for meeting: ${meeting.title}`);

    // Mark as sent
    reminder.sent = true;
    reminder.sentAt = new Date().toISOString();

    // Update meeting
    const updatedMeeting = { ...meeting };
    const reminderIndex = updatedMeeting.reminders.findIndex(r => r.id === reminder.id);
    if (reminderIndex !== -1) {
      updatedMeeting.reminders[reminderIndex] = reminder;
      updatedMeeting.updatedAt = new Date().toISOString();
      this.meetings.set(meeting.id, updatedMeeting);
    }
  }

  /**
   * Get meetings for a participant
   */
  getMeetingsForParticipant(participantId: string, limit: number = 50): ScheduledMeeting[] {
    return Array.from(this.meetings.values())
      .filter(meeting =>
        meeting.participants.some(p => p.id === participantId) ||
        meeting.organizer.id === participantId
      )
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  /**
   * Update meeting response
   */
  async updateMeetingResponse(meetingId: string, participantId: string, response: MeetingParticipant['response']): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    const participant = meeting.participants.find(p => p.id === participantId);
    if (!participant) return false;

    participant.response = response;
    meeting.updatedAt = new Date().toISOString();

    this.meetings.set(meetingId, meeting);
    return true;
  }

  /**
   * Reschedule meeting
   */
  async rescheduleMeeting(meetingId: string, newStartTime: string, newEndTime: string): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    meeting.startTime = newStartTime;
    meeting.endTime = newEndTime;
    meeting.updatedAt = new Date().toISOString();

    // Reset participant responses
    meeting.participants.forEach(p => {
      p.response = 'pending';
    });

    // Reschedule reminders
    this.scheduleReminders(meeting);

    this.meetings.set(meetingId, meeting);
    return true;
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(meetingId: string): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    meeting.status = 'cancelled';
    meeting.updatedAt = new Date().toISOString();

    this.meetings.set(meetingId, meeting);
    return true;
  }

  /**
   * Get meeting analytics
   */
  getMeetingAnalytics(participantId?: string): {
    totalMeetings: number;
    completedMeetings: number;
    averageDuration: number;
    responseRate: number;
    onTimeRate: number;
    topMeetingTimes: { hour: number; count: number }[];
  } {
    let meetings = Array.from(this.meetings.values());

    if (participantId) {
      meetings = meetings.filter(meeting =>
        meeting.participants.some(p => p.id === participantId) ||
        meeting.organizer.id === participantId
      );
    }

    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'completed').length;
    const averageDuration = completedMeetings > 0 ?
      meetings.filter(m => m.status === 'completed')
        .reduce((sum, m) => sum + m.duration, 0) / completedMeetings : 0;

    // Calculate response rate
    const meetingsWithResponses = meetings.filter(m =>
      m.participants.some(p => p.response && p.response !== 'pending')
    );
    const responseRate = totalMeetings > 0 ?
      (meetingsWithResponses.length / totalMeetings) * 100 : 0;

    // Calculate on-time rate (simplified - assuming all completed meetings were on time)
    const onTimeRate = completedMeetings > 0 ?
      (completedMeetings / totalMeetings) * 100 : 0;

    // Find top meeting times
    const hourCounts: Record<number, number> = {};
    meetings.forEach(meeting => {
      const hour = new Date(meeting.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const topMeetingTimes = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalMeetings,
      completedMeetings,
      averageDuration,
      responseRate,
      onTimeRate,
      topMeetingTimes
    };
  }
}

export const meetingSchedulerService = MeetingSchedulerService.getInstance();