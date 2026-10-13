import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  type: string;
  minutes: number;
  points: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const json = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
        if (!active) return;
        setActivities(json.activities ?? []);
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load activities.');
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
      <CapabilityCard title="Activities" description="Track student activity minutes and points.">
        <p role="status">Loading...</p>
      </CapabilityCard>
    );
  }

  if (error) {
    return (
      <CapabilityCard title="Activities" description="Track student activity minutes and points.">
        <p role="alert">Unable to load activities.</p>
      </CapabilityCard>
    );
  }

  if (!activities.length) {
    return (
      <CapabilityCard title="Activities" description="Track student activity minutes and points.">
        <p>No activities available.</p>
      </CapabilityCard>
    );
  }

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points.">
      <ul className="list-unstyled mb-0">
        {activities.map((activity, index) => (
          <li key={`${activity.type}-${activity.minutes}-${index}`}>
            {activity.type} • {activity.minutes} min • {activity.points} pts
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
