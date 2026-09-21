/**
 * Demonic App Store – Native Bridge Abstraktion
 * ============================================================================
 * Diese Datei ist die EINZIGE Stelle im Frontend, die weiß, ob die
 * Web-Anwendung gerade in Safari/einem normalen Browser oder innerhalb der
 * späteren nativen iOS-App (WKWebView-Hülle) läuft. Der Rest der Anwendung
 * ruft ausschließlich die hier exportierten Funktionen auf und muss sich nie
 * um "läuft das gerade nativ?" kümmern.
 *
 * WICHTIG: Die eigentliche Swift/WKWebView-App ist NICHT Teil dieses
 * Projekts. Diese Datei definiert lediglich den Vertrag (die Schnittstelle),
 * über den die native Hülle später optional Zusatzfunktionen anbieten kann.
 * Ohne native Hülle liefert jede Funktion sinnvolle Browser-Fallbacks, die
 * Web-Version bleibt dadurch immer vollständig nutzbar.
 *
 * -----------------------------------------------------------------------
 * ERWARTETER VERTRAG DER NATIVEN SEITE (für die spätere Swift-Umsetzung)
 * -----------------------------------------------------------------------
 * Die native App kann VOR dem Laden der Seite ein synchrones Objekt
 * `window.DemonicNative` injizieren (z. B. über eine
 * `WKUserScript`, die vor Dokumentstart ausgeführt wird), das die folgenden
 * synchronen Felder/Methoden bereitstellt:
 *
 *   window.DemonicNative = {
 *     platform: "ios",                 // string
 *     deviceType: "iphone" | "ipad",   // string
 *     storeVersion: "1.0.0",           // Versionsnummer der nativen Hülle
 *
 *     // Synchron verfügbare, zuletzt bekannte Installationsdaten:
 *     // { "<appId>": { version: "1.3.0", build: 12 }, ... }
 *     installedApps: { },
 *
 *     // Asynchrone Aktionen: die native Seite antwortet, indem sie das vom
 *     // Web-Code übergebene requestId über
 *     // window.dispatchEvent(new CustomEvent('demonicNativeResponse', {
 *     //   detail: { requestId, ok: true, data: {...} }
 *     // }))
 *     // beantwortet. Alternativ (klassischer WKScriptMessageHandler-Stil)
 *     // kann die native Seite auch direkt eine Promise-kompatible Methode
 *     // bereitstellen – siehe callNative() unten, das beide Stile abdeckt.
 *     installApp: function(appId, installUrl, version, build) {},
 *     openApp: function(appId) {},
 *     checkForUpdates: function() {},
 *   };
 *
 * Ist `window.DemonicNative` nicht vorhanden, arbeitet diese Datei
 * ausschließlich mit Browser-Fallbacks (siehe unten).
 */

(function (global) {
  'use strict';

  function hasNativeObject() {
    return typeof global.DemonicNative === 'object' && global.DemonicNative !== null;
  }

  /**
   * true, wenn die Seite erkennbar innerhalb der nativen iOS-Hülle läuft.
   * Erkennung über die injizierte Bridge ODER einen eindeutigen User-Agent-
   * Bestandteil, den die native App optional setzen kann
   * (z. B. "DemonicAppStoreApp/1.0").
   */
  function isNativeApp() {
    if (hasNativeObject()) return true;
    return /DemonicAppStoreApp/i.test(global.navigator.userAgent || '');
  }

  function getPlatform() {
    if (hasNativeObject() && global.DemonicNative.platform) {
      return global.DemonicNative.platform;
    }
    const ua = global.navigator.userAgent || '';
    if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ipad';
    if (/iPhone|iPod/i.test(ua)) return 'iphone';
    return 'web';
  }

  function getDeviceType() {
    if (hasNativeObject() && global.DemonicNative.deviceType) {
      return global.DemonicNative.deviceType;
    }
    const platform = getPlatform();
    if (platform === 'ipad') return 'ipad';
    if (platform === 'iphone') return 'iphone';
    return 'desktop';
  }

  function getStoreVersion() {
    if (hasNativeObject() && global.DemonicNative.storeVersion) {
      return global.DemonicNative.storeVersion;
    }
    return null;
  }

  /**
   * Liefert bekannte installierte Apps + Versionen als
   * { [appId]: { version, build } }. Ohne native Bridge immer leer –
   * der Client zeigt dann grundsätzlich "INSTALL" an.
   */
  async function getInstalledApps() {
    if (hasNativeObject() && global.DemonicNative.installedApps) {
      return global.DemonicNative.installedApps;
    }
    if (hasNativeObject() && typeof global.DemonicNative.getInstalledApps === 'function') {
      try {
        return (await callNative('getInstalledApps')) || {};
      } catch {
        return {};
      }
    }
    return {};
  }

  let requestCounter = 0;
  const pendingRequests = new Map();

  global.addEventListener('demonicNativeResponse', (event) => {
    const { requestId, ok, data, error } = (event && event.detail) || {};
    const pending = pendingRequests.get(requestId);
    if (!pending) return;
    pendingRequests.delete(requestId);
    if (ok) pending.resolve(data);
    else pending.reject(new Error(error || 'Native Anfrage fehlgeschlagen.'));
  });

  /**
   * Ruft eine Methode auf window.DemonicNative auf und unterstützt sowohl
   * synchrone/Promise-Rückgaben als auch das Event-basierte Antwortmuster
   * (für WKScriptMessageHandler-Implementierungen, die nicht direkt einen
   * Rückgabewert liefern können).
   */
  function callNative(method, ...args) {
    if (!hasNativeObject() || typeof global.DemonicNative[method] !== 'function') {
      return Promise.reject(new Error(`Native Methode "${method}" nicht verfügbar.`));
    }

    const result = global.DemonicNative[method](...args);

    // Fall 1: native Methode gibt bereits ein Promise oder einen Wert zurück.
    if (result !== undefined) {
      return Promise.resolve(result);
    }

    // Fall 2: native Methode antwortet asynchron per CustomEvent.
    requestCounter += 1;
    const requestId = `req_${Date.now()}_${requestCounter}`;
    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
      try {
        global.DemonicNative[method](...args, requestId);
      } catch (err) {
        pendingRequests.delete(requestId);
        reject(err);
      }
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          reject(new Error('Zeitüberschreitung bei nativer Anfrage.'));
        }
      }, 15000);
    });
  }

  /**
   * Startet die Installation einer App.
   * - Nativ: delegiert an die iOS-Hülle inkl. Version/Build, damit die
   *   native App den Installationsvorgang in ihrer lokalen Registry
   *   vermerken kann (z. B. um Installed/Update-Status zu verfolgen).
   * - Browser-Fallback: öffnet die vom Backend gelieferte installUrl
   *   (z. B. ein itms-services://-Link für OTA-Installation).
   */
  async function installApp(app) {
    if (hasNativeObject() && typeof global.DemonicNative.installApp === 'function') {
      return callNative('installApp', app.id, app.installUrl, app.version, app.build);
    }
    if (app.installUrl) {
      global.location.href = app.installUrl;
      return { ok: true, delegated: 'browser' };
    }
    if (!app.version) {
      throw new Error('Für diese App wurde noch keine installierbare Version veröffentlicht.');
    }
    throw new Error('Für die veröffentlichte Version wurde noch keine IPA-Datei hochgeladen.');
  }

  /** Öffnet eine bereits installierte App (nur sinnvoll innerhalb der nativen Hülle). */
  async function openApp(app) {
    if (hasNativeObject() && typeof global.DemonicNative.openApp === 'function') {
      return callNative('openApp', app.id);
    }
    throw new Error('Das Öffnen installierter Apps ist nur in der iOS-App möglich.');
  }

  /** Fragt (falls verfügbar) aktiv nach frischen Installationsdaten. */
  async function checkForUpdates() {
    if (hasNativeObject() && typeof global.DemonicNative.checkForUpdates === 'function') {
      try {
        return await callNative('checkForUpdates');
      } catch {
        return getInstalledApps();
      }
    }
    return getInstalledApps();
  }

  /**
   * Ermittelt den UI-Zustand eines Install-Buttons anhand des Server-Status
   * einer App und – falls vorhanden – der von der nativen Bridge gemeldeten
   * installierten Version. Ohne Bridge ist der Zustand immer "install"
   * (außer die App ist serverseitig als "unavailable" markiert).
   *
   * @returns {"install"|"update"|"open"|"unavailable"}
   */
  function resolveAppState(app, installedApps) {
    if (!app || app.status === 'unavailable' || !app.version) return 'unavailable';

    const installed = installedApps && installedApps[app.id];
    if (!installed) return 'install';

    if (isNativeApp()) {
      if (installed.version && app.version && installed.version !== app.version) {
        return 'update';
      }
      return 'open';
    }

    return 'install';
  }

  global.nativeBridge = {
    isNativeApp,
    getPlatform,
    getDeviceType,
    getStoreVersion,
    getInstalledApps,
    installApp,
    openApp,
    checkForUpdates,
    resolveAppState,
  };
})(window);
