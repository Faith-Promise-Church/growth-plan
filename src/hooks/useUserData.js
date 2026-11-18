import { useAuth } from '../auth/AuthContext.jsx';
import { useAsync } from './useAsync.js';
import { listAssessments, getPlan, listGoals, listPlans, getEmailPreferences, listCheckins } from '../data/api.js';
import { currentPlanYear } from '../lib/time.js';

// What Home and the plan pages need: assessments, this year's plan and its goals.
export function usePlanData(year = currentPlanYear(), { withCheckins = false } = {}) {
  const { user } = useAuth();
  return useAsync(async () => {
    if (!user) return null;
    const [assessments, plan, plans, prefs, checkins] = await Promise.all([
      listAssessments(user.id, 10),
      getPlan(user.id, year),
      listPlans(user.id),
      withCheckins ? getEmailPreferences(user.id) : Promise.resolve(null),
      withCheckins ? listCheckins(user.id, 6) : Promise.resolve([]),
    ]);
    const goals = plan ? await listGoals(plan.id) : [];
    return { assessments, latest: assessments[0] ?? null, previous: assessments[1] ?? null, plan, plans, goals, prefs, checkins };
  }, [user?.id, year, withCheckins]);
}
