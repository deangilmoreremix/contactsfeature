import { useState } from 'react';

export const useContactTabs = (initialTab = 'overview') => {
  const [activeTab, setActiveTab] = useState(initialTab);

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  return {
    activeTab,
    setActiveTab,
    changeTab
  };
};