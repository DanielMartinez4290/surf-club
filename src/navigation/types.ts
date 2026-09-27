export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  Login: undefined;
  Register: { verifiedPhoneNumber?: string } | undefined;
  PhoneSignIn: undefined;
  VerifyCode: { countryCode: string; phoneNumber: string };
};

export type AppTabParamList = {
  Profile: undefined;
  Events: undefined;
  Messages: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  EditProfile: undefined;
  CreateEvent: undefined;
  EditEvent: { eventId: number };
  EventSignup: { eventId: number };
  UserProfile: { userId: number; firstName: string; image?: string | null };
  Chat: { userId: number; name: string; image?: string | null };
  GroupChat: { eventId: number; title: string; image?: string | null };
  AdminDashboard: undefined;
};
