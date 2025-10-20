// src/CalendarApp.tsx
import React from 'react';

interface CalendarAppProps {
  theme?: 'light' | 'dark';
  mode?: 'light' | 'dark';
  sharedData?: any;
  onDataUpdate?: (data: any) => void;
}

const CalendarApp: React.FC<CalendarAppProps> = ({
  theme = 'light',
  mode = 'light',
  sharedData,
  onDataUpdate
}) => {
  return (
    <div className="w-full h-full">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Calendar App</h1>
        <p className="text-gray-600">Calendar functionality will be implemented here.</p>
        <div className="mt-4">
          <p>Theme: {theme}</p>
          <p>Mode: {mode}</p>
          <p>Shared Data: {JSON.stringify(sharedData, null, 2)}</p>
        </div>
      </div>
    </div>
  );
};

export default CalendarApp;