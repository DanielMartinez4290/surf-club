const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill it in before running the app.`
    );
  }
  return value;
};

export const env = {
  apiUrl: required(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL'),
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
};
