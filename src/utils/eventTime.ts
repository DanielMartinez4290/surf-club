import dayjs from 'dayjs';

// Event times are saved as the organizer's local clock time ("2026-10-25 08:00:00"),
// but the API labels them UTC on the way out ("2026-10-25T08:00:00+00:00"). Letting
// dayjs/Date honor that offset shifts the time by the phone's UTC offset (8am
// showing as 1am in Pacific time), so drop the offset and read the clock time as-is.
export const parseEventTime = (value: string) => dayjs(value.slice(0, 19));
