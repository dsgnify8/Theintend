// A new article, twice a week, on the lock screen.
//
// Scheduled on the device rather than sent from a server. Nothing to deploy,
// no cost to run, works with no network. The trade is that the articles are
// picked when scheduling happens rather than when the notification fires, so
// it schedules a month ahead and refreshes every time the app opens.
import * as Notifications from 'expo-notifications';

// Sunday and Wednesday. Expo counts Sunday as 1.
const DAYS = [1, 4];
const HOUR = 9;
const MINUTE = 0;

// A month ahead, so someone who does not open the app for a few weeks still
// gets them.
const AHEAD = 8;

const PREFIX = 'article-digest-';

export type DigestArticle = { id: string; title: string; excerpt?: string };

function nextDates(count: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  const d = new Date(now);
  d.setHours(HOUR, MINUTE, 0, 0);
  // Start from tomorrow, so rescheduling during the day cannot fire one
  // immediately.
  d.setDate(d.getDate() + 1);
  while (out.length < count) {
    // getDay gives Sunday as 0, and we count from 1.
    if (DAYS.includes(d.getDay() + 1)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

async function clearExisting() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => String(n.identifier ?? '').startsWith(PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {}
}

// Trimmed so it reads on a lock screen rather than being cut mid word.
function teaser(a: DigestArticle): string {
  const t = (a.excerpt ?? '').trim();
  if (!t) return 'Something new to read.';
  if (t.length <= 110) return t;
  const cut = t.slice(0, 110);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '));
  return (stop > 60 ? cut.slice(0, stop) : cut).replace(/[,.]$/, '') + '...';
}

export async function scheduleArticleDigest(articles: DigestArticle[]): Promise<number> {
  await clearExisting();
  if (!articles.length) return 0;

  const dates = nextDates(AHEAD);
  let made = 0;

  for (let i = 0; i < dates.length; i++) {
    const a = articles[i % articles.length];
    if (!a?.id) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${i}`,
        content: {
          title: a.title,
          body: teaser(a),
          sound: 'default',
          // Read by the tap handler in the root layout.
          data: { route: `/article/${a.id}`, kind: 'article_digest' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dates[i] },
      });
      made++;
    } catch {}
  }
  return made;
}

export async function cancelArticleDigest() {
  await clearExisting();
}
