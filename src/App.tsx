import React from "react";
import { VoiceAgentPanel } from "./components/VoiceAgentPanel";
import { VideoAgentPanel } from "./components/VideoAgentPanel";
import { HeatmapPanel } from "./components/HeatmapPanel";
import { PlaybooksPanel } from "./components/PlaybooksPanel";
import { AutopilotPanel } from "./components/AutopilotPanel";
import { SkillsPanel } from "./components/SkillsPanel";
import { MemoryPanel } from "./components/MemoryPanel";
import { MoodPanel } from "./components/MoodPanel";
import { CalendarAIPanel } from "./components/CalendarAIPanel";
import { ColdEmailSDRAgent } from "./components/sdr/ColdEmailSDRAgent";
import { FollowUpSDRAgent } from "./components/sdr/FollowUpSDRAgent";
import { ObjectionHandlerSDRAgent } from "./components/sdr/ObjectionHandlerSDRAgent";
import { ReactivationSDRAgent } from "./components/sdr/ReactivationSDRAgent";
import { WinBackSDRAgent } from "./components/sdr/WinBackSDRAgent";

const App: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7fafc",
        padding: 24,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      }}
    >
      <h1 style={{ marginBottom: 24 }}>SmartCRM AI Sales OS</h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          marginBottom: 24
        }}
      >
        <VoiceAgentPanel />
        <VideoAgentPanel />
        <AutopilotPanel />
        <SkillsPanel />
      </div>

      <HeatmapPanel />
      <PlaybooksPanel />
      <MemoryPanel />
      <MoodPanel />
      <CalendarAIPanel />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          marginTop: 24,
          paddingTop: 24,
          borderTop: "1px solid #e2e8f0"
        }}
      >
        <ColdEmailSDRAgent />
        <FollowUpSDRAgent />
        <ObjectionHandlerSDRAgent />
        <ReactivationSDRAgent />
        <WinBackSDRAgent />
      </div>
    </div>
  );
};

export default App;
