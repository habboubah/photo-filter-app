/*
 * Home's greeting by the time of day — no name: there is no account. Morning
 * from 5, day from 11, evening from 18 (and through the night).
 */
export type Greeting = 'morning' | 'day' | 'evening';

export function greetingAt(hour: number): Greeting {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 18) return 'day';
  return 'evening';
}
