import dayjs from 'dayjs';

// `birthday` is a date-only string ("1990-05-14") from the API.
export const ageFromBirthday = (birthday: string | null | undefined): number | null =>
  birthday ? dayjs().diff(dayjs(birthday), 'year') : null;
