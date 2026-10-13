import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus: string;
  reason: string;
};

const defaultEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const json = await getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(defaultEmail)}`);
        if (!active) return;
        setSuggestions(json.suggestions ?? []);
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load workout suggestions.');
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
      <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
        <p role="status">Loading...</p>
      </CapabilityCard>
    );
  }

  if (error) {
    return (
      <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
        <p role="alert">Unable to load workout suggestions.</p>
      </CapabilityCard>
    );
  }

  if (!suggestions.length) {
    return (
      <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
        <p>No workout suggestions available.</p>
      </CapabilityCard>
    );
  }

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      <ul className="list-unstyled mb-0">
        {suggestions.map((suggestion) => (
          <li key={suggestion.title}>
            <strong>{suggestion.title}</strong> — {suggestion.focus}<br />
            <small>{suggestion.reason}</small>
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
