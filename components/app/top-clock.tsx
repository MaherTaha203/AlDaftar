'use client';

import { useEffect, useState } from 'react';

/**
 * TopClock — live time · weekday · date in the top bar (System Status &
 * Productivity Bar). Arabic weekday, 12-hour time with ص/م, DD/MM/YYYY with
 * Latin tabular figures (the app's numeric convention). Updates every 30s
 * without a page refresh. Renders nothing until mounted to avoid a
 * server/client hydration mismatch. On narrow screens the three parts stack.
 */
const WEEKDAY = new Intl.DateTimeFormat('ar', { weekday: 'long' });

function parts(now: Date) {
  const weekday = WEEKDAY.format(now);
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const date = `${dd}/${mm}/${yyyy}`;
  let hours = now.getHours();
  const meridiem = hours < 12 ? 'ص' : 'م';
  hours = hours % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes} ${meridiem}`;
  return { weekday, date, time };
}

export function TopClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) {
    return null;
  }
  const { weekday, date, time } = parts(now);

  return (
    <div
      className="flex flex-wrap items-center gap-x-sm gap-y-0 text-xs text-neutral-400 max-lg:hidden"
      aria-label={`الوقت والتاريخ: ${time} ${weekday} ${date}`}
    >
      <span className="font-medium text-neutral-500 tabular-nums" dir="ltr">
        {time}
      </span>
      <span aria-hidden="true" className="text-neutral-300">
        •
      </span>
      <span>{weekday}</span>
      <span aria-hidden="true" className="text-neutral-300">
        •
      </span>
      <span className="tabular-nums" dir="ltr">
        {date}
      </span>
    </div>
  );
}
