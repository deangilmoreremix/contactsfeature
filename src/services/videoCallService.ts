/**
 * Video Calling Integration Service
 * Supports Zoom, Google Meet, and Microsoft Teams integration
 */

export interface VideoCall {
  id: string;
  title: string;
  description?: string | undefined;
  platform: 'zoom' | 'meet' | 'teams';
  meetingUrl: string;
  meetingId?: string;
  passcode?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  participants: VideoParticipant[];
  hostId: string;
  contactId?: string | undefined;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  recordingUrl?: string;
  notes?: string;
}

export interface VideoParticipant {
  id: string;
  name: string;
  email: string;
  role: 'host' | 'participant';
  joinTime?: string;
  leaveTime?: string;
  duration?: number; // in minutes
}

export interface MeetingRequest {
  title: string;
  description?: string;
  platform: 'zoom' | 'meet' | 'teams';
  startTime: Date;
  duration: number;
  participants: { name: string; email: string }[];
  contactId?: string;
}

export class VideoCallService {
  private static instance: VideoCallService;
  private meetings: Map<string, VideoCall> = new Map();

  static getInstance(): VideoCallService {
    if (!VideoCallService.instance) {
      VideoCallService.instance = new VideoCallService();
    }
    return VideoCallService.instance;
  }

  /**
   * Schedule a new video meeting
   */
  async scheduleMeeting(request: MeetingRequest): Promise<VideoCall> {
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate meeting URL based on platform
    const meetingUrl = this.generateMeetingUrl(request.platform, meetingId);

    const meeting: VideoCall = {
      id: meetingId,
      title: request.title,
      description: request.description,
      platform: request.platform,
      meetingUrl,
      meetingId: this.generatePlatformMeetingId(request.platform),
      passcode: this.generatePasscode(),
      startTime: request.startTime.toISOString(),
      duration: request.duration,
      participants: request.participants.map((p, index) => ({
        id: `participant_${index}`,
        name: p.name,
        email: p.email,
        role: index === 0 ? 'host' : 'participant'
      })),
      hostId: request.participants[0]?.email || 'unknown',
      contactId: request.contactId,
      status: 'scheduled'
    };

    this.meetings.set(meetingId, meeting);
    return meeting;
  }

  /**
   * Generate meeting URL based on platform
   */
  private generateMeetingUrl(platform: string, meetingId: string): string {
    switch (platform) {
      case 'zoom':
        return `https://zoom.us/j/${this.generatePlatformMeetingId('zoom')}`;
      case 'meet':
        return `https://meet.google.com/${this.generatePlatformMeetingId('meet')}`;
      case 'teams':
        return `https://teams.microsoft.com/l/meetup-join/${this.generatePlatformMeetingId('teams')}`;
      default:
        return `https://example.com/meeting/${meetingId}`;
    }
  }

  /**
   * Generate platform-specific meeting ID
   */
  private generatePlatformMeetingId(platform: string): string {
    const randomNum = Math.floor(Math.random() * 1000000000);
    switch (platform) {
      case 'zoom':
        return randomNum.toString();
      case 'meet':
        return `${randomNum.toString().slice(0, 3)}-${randomNum.toString().slice(3, 6)}-${randomNum.toString().slice(6)}`;
      case 'teams':
        return randomNum.toString();
      default:
        return randomNum.toString();
    }
  }

  /**
   * Generate meeting passcode
   */
  private generatePasscode(): string {
    return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  }

  /**
   * Start a meeting (mark as in progress)
   */
  async startMeeting(meetingId: string): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    meeting.status = 'in_progress';
    this.meetings.set(meetingId, meeting);
    return true;
  }

  /**
   * End a meeting
   */
  async endMeeting(meetingId: string, notes?: string): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    meeting.status = 'completed';
    meeting.endTime = new Date().toISOString();
    if (notes) meeting.notes = notes;

    this.meetings.set(meetingId, meeting);
    return true;
  }

  /**
   * Get meeting by ID
   */
  getMeeting(meetingId: string): VideoCall | undefined {
    return this.meetings.get(meetingId);
  }

  /**
   * Get meetings for a contact
   */
  getMeetingsForContact(contactId: string): VideoCall[] {
    return Array.from(this.meetings.values())
      .filter(meeting => meeting.contactId === contactId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  /**
   * Get upcoming meetings
   */
  getUpcomingMeetings(hoursAhead: number = 24): VideoCall[] {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return Array.from(this.meetings.values())
      .filter(meeting => {
        const meetingTime = new Date(meeting.startTime);
        return meeting.status === 'scheduled' &&
               meetingTime >= now &&
               meetingTime <= futureTime;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  /**
   * Update meeting participants
   */
  async updateParticipants(meetingId: string, participants: VideoParticipant[]): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    meeting.participants = participants;
    this.meetings.set(meetingId, meeting);
    return true;
  }

  /**
   * Add meeting recording
   */
  async addRecording(meetingId: string, recordingUrl: string): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    meeting.recordingUrl = recordingUrl;
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
    this.meetings.set(meetingId, meeting);
    return true;
  }

  /**
   * Get meeting statistics
   */
  getMeetingStats(contactId?: string): {
    totalMeetings: number;
    completedMeetings: number;
    upcomingMeetings: number;
    averageDuration: number;
    totalParticipants: number;
  } {
    let meetings = Array.from(this.meetings.values());

    if (contactId) {
      meetings = meetings.filter(m => m.contactId === contactId);
    }

    const totalMeetings = meetings.length;
    const completedMeetings = meetings.filter(m => m.status === 'completed').length;
    const upcomingMeetings = meetings.filter(m => m.status === 'scheduled').length;

    const completedMeetingsWithDuration = meetings.filter(m => m.status === 'completed' && m.duration);
    const averageDuration = completedMeetingsWithDuration.length > 0
      ? completedMeetingsWithDuration.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMeetingsWithDuration.length
      : 0;

    const totalParticipants = meetings.reduce((sum, m) => sum + m.participants.length, 0);

    return {
      totalMeetings,
      completedMeetings,
      upcomingMeetings,
      averageDuration,
      totalParticipants
    };
  }

  /**
   * Generate calendar invite
   */
  generateCalendarInvite(meeting: VideoCall): string {
    const startTime = new Date(meeting.startTime);
    const endTime = meeting.endTime ? new Date(meeting.endTime) :
                   new Date(startTime.getTime() + (meeting.duration || 60) * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const participants = meeting.participants.map(p => `ATTENDEE;CN="${p.name}":mailto:${p.email}`).join('\r\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Contact CRM//Video Call//EN
BEGIN:VEVENT
UID:${meeting.id}@contact-crm.com
DTSTART:${formatDate(startTime)}
DTEND:${formatDate(endTime)}
SUMMARY:${meeting.title}
DESCRIPTION:${meeting.description || 'Video meeting'}
LOCATION:${meeting.meetingUrl}
${participants}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.replace(/\n/g, '\r\n');
  }

  /**
   * Send meeting reminders
   */
  async sendMeetingReminders(meetingId: string, minutesBefore: number = 15): Promise<boolean> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    // In a real implementation, this would send emails/SMS reminders
    console.log(`Sending ${minutesBefore}-minute reminder for meeting: ${meeting.title}`);

    // Schedule reminder
    const reminderTime = new Date(new Date(meeting.startTime).getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    if (reminderTime > now) {
      setTimeout(() => {
        console.log(`Reminder: Meeting "${meeting.title}" starts in ${minutesBefore} minutes`);
        // Here you would integrate with email/SMS services
      }, reminderTime.getTime() - now.getTime());
    }

    return true;
  }

  /**
   * Get platform-specific integration URLs
   */
  getPlatformUrls(platform: string): {
    scheduleUrl?: string;
    appUrl?: string;
    helpUrl?: string;
  } {
    switch (platform) {
      case 'zoom':
        return {
          scheduleUrl: 'https://zoom.us/meeting/schedule',
          appUrl: 'https://zoom.us/download',
          helpUrl: 'https://support.zoom.us'
        };
      case 'meet':
        return {
          scheduleUrl: 'https://calendar.google.com',
          appUrl: 'https://meet.google.com',
          helpUrl: 'https://support.google.com/meet'
        };
      case 'teams':
        return {
          scheduleUrl: 'https://teams.microsoft.com',
          appUrl: 'https://teams.microsoft.com/downloads',
          helpUrl: 'https://support.microsoft.com/teams'
        };
      default:
        return {};
    }
  }
}

export const videoCallService = VideoCallService.getInstance();