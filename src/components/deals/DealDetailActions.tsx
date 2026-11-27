import React, { useState } from 'react';
import { executeDealAi } from '../../ai/deal/executeDealAi';

interface DealDetailActionsProps {
  dealId: string;
  workspaceId: string;
  onEditSave?: (oldDeal: any, newDeal: any) => void;
}

export const DealDetailActions: React.FC<DealDetailActionsProps> = ({ dealId, workspaceId }) => {
  const [favoriteTooltip, setFavoriteTooltip] = useState('');
  const [, setShareData] = useState<any>(null);

  const handleFavorite = async () => {
    const result = await executeDealAi({ task: 'deal_favorite_insights', dealId, workspaceId, live: { onDelta: (_t, full) => setFavoriteTooltip(full) } });
    setFavoriteTooltip(result);
  };

  const handleShare = async () => {
    const result = await executeDealAi({ task: 'deal_share_summary', dealId, workspaceId });
    setShareData(result);
    // Perhaps open share modal or copy to clipboard
  };

  return (
    <div className="deal-actions">
      <button onClick={handleFavorite} title={favoriteTooltip}>❤️ Add to Favorites</button>
      <button onClick={handleShare}>📤 Share Deal</button>
      {/* Edit save would be in the form */}
    </div>
  );
};