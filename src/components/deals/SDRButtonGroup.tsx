import React from 'react';
import { executeDealAi } from '../../ai/deal/executeDealAi';

interface SDRButtonGroupProps {
  dealId: string;
  workspaceId: string;
  personaId?: string;
  onSequenceGenerated?: (sequence: any) => void;
}

export const SDRButtonGroup: React.FC<SDRButtonGroupProps> = ({ dealId, workspaceId, personaId, onSequenceGenerated }) => {
  const handleSDRTask = async (task: string, options: any = {}) => {
    const result = await executeDealAi({ 
      task: task as any, 
      dealId, 
      workspaceId, 
      options: { 
        personaId, 
        lengthDays: 7, 
        channel: 'email', 
        tone: 'friendly', 
        ...options 
      } 
    });
    if (onSequenceGenerated) onSequenceGenerated(result);
  };

  return (
    <div className="sdr-buttons">
      <button onClick={() => handleSDRTask('sdr_follow_up')}>📧 Follow-Up SDR</button>
      <button onClick={() => handleSDRTask('sdr_enrich_contact')}>🧠 Enrich Contact</button>
      <button onClick={() => handleSDRTask('sdr_competitor')}>🎯 Competitor SDR</button>
      <button onClick={() => handleSDRTask('sdr_objection_handler')}>⚠️ Handle Objections</button>
      <button onClick={() => handleSDRTask('sdr_high_intent')}>⚡ High-Intent SDR</button>
      <button onClick={() => handleSDRTask('sdr_bump')}>💬 Bump Message</button>
      <button onClick={() => handleSDRTask('sdr_reactivation')}>🔄 Reactivation SDR</button>
      <button onClick={() => handleSDRTask('sdr_winback')}>🏆 Winback SDR</button>
      <button onClick={() => handleSDRTask('sdr_linkedin')}>💼 LinkedIn SDR</button>
      <button onClick={() => handleSDRTask('sdr_whatsapp')}>📱 WhatsApp SDR</button>
      <button onClick={() => handleSDRTask('sdr_event')}>📅 Event SDR</button>
      <button onClick={() => handleSDRTask('sdr_referral')}>👥 Referral SDR</button>
      <button onClick={() => handleSDRTask('sdr_newsletter')}>📰 Newsletter SDR</button>
      <button onClick={() => handleSDRTask('sdr_cold_email')}>❄️ Cold Email SDR</button>
    </div>
  );
};