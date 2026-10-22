import { initFederation } from '@angular-architects/native-federation';
import { THttpResponse } from '../../hmdm-ui-kit/src/public-api';
import { environment } from './environments/environment';

export type TServerPlugin = {
  id: number;
  identifier: string;
  name: string;
  description: string;
  createTime: string;
  disabled: boolean;
  nameLocalizationKey: string;
  settingsPermission: string;
  functionsPermission: string;
  deviceFunctionsPermission: string;
  enabledForDevice: boolean;
  baseUrl: string;
  baseUrlDev: string;
  icon: string;
};

// The panel's path on the server: '' at the server root, e.g. '/hmdm' under a context path.
// Plugins served by the panel itself are registered as /plugins/<id> and need this in front.
const basePath = new URL(document.baseURI).pathname.replace(/\/$/, '');

fetch(`${environment.baseApiUrl}rest/public/plugin/main/registered`)
  .then((response) => response.json())
  .then((serverManifest) => {
    // Transform server format to Native Federation format
    const federationManifest = transformManifest(serverManifest);

    return initFederation(federationManifest);
  })
  .then((map) => {
    const availablePlugins = Object.keys(map?.scopes || {});
    const isDevelopment = environment.development;

    (window as any).__DYNPLUGINS__ = (window as any).__DYNPLUGINS__.filter(
      (plugin: any) =>
        !!availablePlugins.find((availablePlugin) => {
          if (isDevelopment) {
            return availablePlugin.startsWith(plugin.baseUrl);
          }

          return availablePlugin === `${basePath}/plugins/${plugin.identifier}/`;
        }),
    );

    return import('./bootstrap');
  })
  .catch((err) => {
    console.error('Federation init failed:', err);
    console.warn('Initializing with empty federation to allow main app to work');
    // Initialize empty __DYNPLUGINS__ array for main app
    (window as any).__DYNPLUGINS__ = [];
    // Initialize with empty federation so main app can still work
    return initFederation({})
      .then(() => import('./bootstrap'))
      .catch((bootstrapErr) => console.error('Bootstrap failed:', bootstrapErr));
  });

function transformManifest(serverManifest: THttpResponse<TServerPlugin[]>) {
  if (!serverManifest?.data) {
    console.error('Server manifest invalid or missing');
    return {};
  }

  const serverManifestData = serverManifest.data;
  const manifest: Record<string, string> = {};

  (window as any).__DYNPLUGINS__ = [];

  return serverManifestData
    .filter((plugin) => !plugin.disabled && (!!plugin.baseUrl || !!plugin.baseUrlDev))
    .reduce((acc, plugin) => {
      const baseUrl = environment.development
        ? plugin.baseUrlDev
        : plugin.baseUrl?.startsWith('/plugins/')
          ? basePath + plugin.baseUrl
          : plugin.baseUrl;

      (window as any).__DYNPLUGINS__.push({
        ...plugin,
        path: `plugins/${plugin.identifier}`,
        baseUrl,
      });

      acc[plugin.identifier] = baseUrl + '/remoteEntry.json';
      return acc;
    }, manifest);
}
