import { registerRootComponent } from 'expo';

import App from './App';
// Registers the background task for "on my way" location sharing; must load at startup.
import './src/location/liveShare';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
