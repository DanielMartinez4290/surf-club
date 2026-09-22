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
  Chat: { userId: number; name: string };
  GroupChat: { eventId: number; title: string };
  AdminDashboard: undefined;
};
