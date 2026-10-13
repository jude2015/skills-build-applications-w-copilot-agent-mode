import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  name: string;
  members: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const json = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (!active) return;
        setTeams(json.teams ?? []);
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load teams.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <CapabilityCard title="Teams" description="Manage teams and members.">
        <p role="status">Loading...</p>
      </CapabilityCard>
    );
  }

  if (error) {
    return (
      <CapabilityCard title="Teams" description="Manage teams and members.">
        <p role="alert">Unable to load teams.</p>
      </CapabilityCard>
    );
  }

  if (!teams.length) {
    return (
      <CapabilityCard title="Teams" description="Manage teams and members.">
        <p>No teams available.</p>
      </CapabilityCard>
    );
  }

  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      <ul className="list-unstyled mb-0">
        {teams.map((team) => (
          <li key={team.name}>
            <strong>{team.name}</strong> • {team.members.length} member{team.members.length === 1 ? '' : 's'}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
