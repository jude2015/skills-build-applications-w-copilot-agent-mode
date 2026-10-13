import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function invalidRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function toObjectId(value: unknown, label: string) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throw invalidRequest(`Invalid ${label} id`);
  }
  return new mongoose.Types.ObjectId(value);
}

function serializeActivity(activity: { user?: { toString(): string }; team?: { toString(): string }; [key: string]: unknown }) {
  return {
    ...activity,
    user: activity.user?.toString?.() ?? activity.user,
    team: activity.team?.toString?.() ?? activity.team,
  };
}

function serializeTeam(team: { members?: unknown[]; [key: string]: unknown }) {
  return {
    ...team,
    members: Array.isArray(team.members)
      ? team.members.map((member) => (typeof member === 'string' ? member : member && typeof member === 'object' && '_id' in member ? String((member as { _id?: unknown })._id ?? member) : String(member)))
      : [],
  };
}

export async function listActivities() {
  const activities = await Activity.find().sort({ occurredAt: -1 }).lean();
  return activities.map((activity) => serializeActivity(activity));
}

export async function createActivity(input: unknown) {
  const body = input as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    throw invalidRequest('Activity payload is required');
  }

  const userId = toObjectId(body.userId, 'user');
  const teamId = toObjectId(body.teamId, 'team');
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const minutes = Number(body.minutes);

  if (!type) throw invalidRequest('Activity type is required');
  if (!Number.isFinite(minutes) || minutes <= 0) throw invalidRequest('Minutes must be a positive number');
  if (!(await User.exists({ _id: userId }))) throw Object.assign(new Error('User not found'), { status: 404 });
  if (!(await Team.exists({ _id: teamId }))) throw Object.assign(new Error('Team not found'), { status: 404 });

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: Math.max(1, Math.round(minutes)),
    occurredAt: new Date(),
  });

  return serializeActivity(activity.toObject());
}

export async function listTeams() {
  const teams = await Team.find().populate('members').lean();
  return teams.map((team) => serializeTeam(team));
}

export async function createTeam(input: unknown) {
  const body = input as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    throw invalidRequest('Team payload is required');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';
  const rawMembers = Array.isArray(body.members) ? body.members : [];

  if (!name) throw invalidRequest('Team name is required');
  if (!mascot) throw invalidRequest('Team mascot is required');

  const members = Array.from(new Set(rawMembers.map((member) => {
    if (typeof member !== 'string' || !mongoose.isValidObjectId(member)) {
      throw invalidRequest('Team members must be valid ObjectIds');
    }
    return new mongoose.Types.ObjectId(member);
  })));

  const team = await Team.create({ name, mascot, members });
  return serializeTeam(team.toObject());
}

export async function getLeaderboard() {
  const leaderboard = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'teamInfo' } },
    { $unwind: '$teamInfo' },
    { $project: { _id: 0, teamName: '$teamInfo.name', totalPoints: 1 } },
  ]);

  return leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentType = recentActivities[0]?.type?.toLowerCase() ?? (typeof user.fitnessGoal === 'string' ? user.fitnessGoal.toLowerCase() : 'activity');
  const workouts = await Workout.find().lean();

  const scored = workouts.map((workout) => {
    const focus = String(workout.focus ?? '').toLowerCase();
    const goal = String(user.fitnessGoal ?? '').toLowerCase();
    const recent = recentType.toLowerCase();
    let score = 0;

    if (focus === goal) score += 5;
    if (focus.includes(goal)) score += 2;
    if (focus.includes(recent)) score += 3;
    if (recent.includes(focus)) score += 2;

    return { score, workout };
  });

  const suggestions = scored
    .sort((left, right) => right.score - left.score || String(left.workout.title).localeCompare(String(right.workout.title)))
    .map(({ workout }) => ({
      ...workout,
      reason: `This workout matches your recent ${recentType} activity and ${user.fitnessGoal} goal.`,
    }));

  return suggestions;
}

export { User };
