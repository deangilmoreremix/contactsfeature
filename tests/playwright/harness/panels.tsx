/**
 * Test-only entry: mounts the real Skills / Memory / Heatmap / … panels so Playwright can watch them fill in while
 * the dripping SSE server answers.   ?c=skills|memory|heatmap|mood|playbooks|video|voice   &theme=light|dark
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../src/index.css';
import { SkillsPanel } from '../../../src/components/SkillsPanel';
import { MemoryPanel } from '../../../src/components/MemoryPanel';
import { HeatmapPanel } from '../../../src/components/HeatmapPanel';
import { MoodPanel } from '../../../src/components/MoodPanel';
import { PlaybooksPanel } from '../../../src/components/PlaybooksPanel';
import { VideoAgentPanel } from '../../../src/components/VideoAgentPanel';
import { VoiceAgentPanel } from '../../../src/components/VoiceAgentPanel';

const params = new URLSearchParams(location.search);
const which = params.get('c') || 'skills';
const dark = params.get('theme') === 'dark';
document.documentElement.classList.toggle('dark', dark);
document.body.classList.toggle('dark-mode', dark);

const view =
  which === 'memory' ? <MemoryPanel /> :
  which === 'heatmap' ? <HeatmapPanel /> :
  which === 'mood' ? <MoodPanel /> :
  which === 'playbooks' ? <PlaybooksPanel /> :
  which === 'video' ? <VideoAgentPanel /> :
  which === 'voice' ? <VoiceAgentPanel /> :
  <SkillsPanel />;

createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"><div style={{ maxWidth: 760 }}>{view}</div></div>
);
