import type { SightingIntelligenceCard } from '@/types/report';

export function intelligenceCardTitle(card: SightingIntelligenceCard | null) {
  return (
    card?.possible_species?.common_name ??
    card?.possible_species?.scientific_name ??
    'Sighting intelligence'
  );
}

export function signalPriorityDisplay(card: Pick<SightingIntelligenceCard, 'signal_priority'>) {
  return card.signal_priority != null ? String(Math.round(card.signal_priority)) : 'Insufficient evidence';
}
