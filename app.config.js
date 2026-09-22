module.exports = {
  expo: {
    name: 'Surf Club ATX',
    slug: 'surf-club-atx',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'surfclubatx',
    plugins: [
      'expo-secure-store',
      'expo-font',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Surf Club ATX uses your photos to set your profile picture and outing photos.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Surf Club ATX uses your location to show outings near you while the app is open.',
        },
      ],
      [
        '@stripe/stripe-react-native',
        {
          enableGooglePay: false,
        },
      ],
    ],
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F6F1E7',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.surfclubatx.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'Surf Club ATX uses your location to show outings near you while the app is open.',
        NSPhotoLibraryUsageDescription:
          'Surf Club ATX uses your photos to set your profile picture and outing photos.',
      },
    },
    android: {
      package: 'com.surfclubatx.app',
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
        backgroundColor: '#F6F1E7',
      },
      permissions: ['android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: 'b3cbaa7c-2d12-4ca2-9425-b74c78f42fc7',
      },
    },
  },
};
