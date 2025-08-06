import React from 'react';
import { Canvas } from '../components/Canvas';

export const ObsPage: React.FC = () => {
  // TODO: Use shared orb state (context or prop)
  const orbs: any[] = [];
  return <Canvas orbs={orbs} />;
};
