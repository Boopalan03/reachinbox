import React from 'react';
import { Badge } from '../ui/Badge';
import type { BadgeVariant } from '../ui/Badge';
import type { EmailStatus } from '../../types/email';

export const StatusBadge: React.FC<{ status: EmailStatus }> = ({ status }) => {
  let variant: BadgeVariant = 'default';
  
  switch (status) {
    case 'SCHEDULED':
    case 'DELAYED':
    case 'PROCESSING':
      variant = 'info';
      break;
    case 'SENT':
      variant = 'success';
      break;
    case 'FAILED':
      variant = 'error';
      break;
  }

  return (
    <Badge variant={variant} className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
};
