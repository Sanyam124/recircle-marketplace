'use client';

import { useAuth } from "@/context/AuthContext";
import CommunityJoinCelebration from "./CommunityJoinCelebration";

export default function CelebrationContainer() {
  const { celebratingCommunities, triggerCelebration } = useAuth();

  if (!celebratingCommunities || celebratingCommunities.length === 0) return null;

  return (
    <CommunityJoinCelebration 
      communityNames={celebratingCommunities} 
      onComplete={() => {
        // The context timeout handles clearing the state, 
        // but it's good to have the onComplete for the redirect logic inside the component.
      }} 
    />
  );
}
