'use client';

import React from 'react';
import {
  Scale,
  Building2,
  Landmark,
  Shield,
  Flag,
  Gavel,
} from 'lucide-react';
import { CertifyingAuthority } from '@/lib/claims-api';

interface AuthoritySelectorProps {
  value: CertifyingAuthority | null;
  onChange: (authority: CertifyingAuthority) => void;
}

const AUTHORITIES: {
  value: CertifyingAuthority;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'notary_public',
    label: 'Notary Public',
    description: 'A licensed notary public',
    icon: Scale,
  },
  {
    value: 'local_government',
    label: 'Local Government',
    description: 'Municipal office or council',
    icon: Building2,
  },
  {
    value: 'bank_branch',
    label: 'Bank Branch',
    description: 'Your local bank branch',
    icon: Landmark,
  },
  {
    value: 'police',
    label: 'Police Station',
    description: 'Local police station',
    icon: Shield,
  },
  {
    value: 'embassy',
    label: 'Embassy / Consulate',
    description: 'German embassy or consulate',
    icon: Flag,
  },
  {
    value: 'justice_of_peace',
    label: 'Justice of the Peace',
    description: 'A JP or Commissioner for Oaths',
    icon: Gavel,
  },
];

export default function AuthoritySelector({ value, onChange }: AuthoritySelectorProps) {
  return (
    <div className="claims-authority-grid">
      {AUTHORITIES.map((authority) => {
        const Icon = authority.icon;
        const isSelected = value === authority.value;

        return (
          <button
            key={authority.value}
            type="button"
            onClick={() => onChange(authority.value)}
            className={`claims-authority-option ${isSelected ? 'selected' : ''}`}
          >
            <div className="claims-authority-icon">
              <Icon className="w-6 h-6" />
            </div>
            <span className="claims-authority-label">{authority.label}</span>
            <span className="claims-authority-description">{authority.description}</span>
          </button>
        );
      })}
    </div>
  );
}
