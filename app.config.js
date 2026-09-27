module.exports = {
  expo: {
    name: 'Wakesurf Club',
    slug: 'surf-club-atx',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'wakesurfclub',
    plugins: [
      [
        'expo-splash-screen',
        {
          // Square branded photo, shown near full width on a navy that matches the logo.
          image: './assets/splash.png',
          imageWidth: 320,
          resizeMode: 'contain',
          backgroundColor: '#0F2C38',
        },
      ],
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
          photosPermission: 'Wakesurf Club uses your photos to set your profile picture and outing photos.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Wakesurf Club uses your location to show outings near you while the app is open.',
        },
      ],
      [
        '@stripe/stripe-react-native',
        {
          enableGooglePay: false,
        },
      ],
    ],
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.surfclub.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'Wakesurf Club uses your location to show outings near you while the app is open.',
        NSPhotoLibraryUsageDescription:
          'Wakesurf Club uses your photos to set your profile picture and outing photos.',
        // Hide expo-dev-menu's floating "Tools" gear in dev builds by default (Cmd+D / shake still
        // open the menu). Release builds don't include the dev menu at all.
        EXDevMenuShowFloatingActionButton: false,
      },
    },
    android: {
      package: 'com.surfclub.app',
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
