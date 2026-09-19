# Demonic App Store

Ein privater App-Katalog für selbst entwickelte, ordnungsgemäß signierte iOS-Apps. Eine einzige Web-Codebasis (Node.js/Express + Vanilla-JS-SPA) bedient gleichzeitig:

1. **Desktop-Browser** (normale Website)
2. **Mobile Safari** (iPhone/iPad, inkl. "Zum Home-Bildschirm hinzufügen" als PWA)
3. **Eine spätere native iOS-App** über `WKWebView`, die exakt dieselbe Seite lädt

Änderungen am Server (neue Apps, Design, Kategorien, Buttons) sind sofort in allen drei Umgebungen sichtbar, ohne dass für reine Web-/Inhalts-Änderungen eine neue native App gebaut werden muss.

> **Wichtig:** Dieses Projekt umgeht keinerlei Apple-Sicherheitsmechanismen oder Code-Signing. Es verwaltet ausschließlich Apps, IPAs und Installationslinks, die du selbst ordnungsgemäß signiert und über eine von Apple unterstützte Verteilungsmethode freigegeben hast (z. B. Ad-hoc/In-House-OTA-Manifeste, TestFlight-Links oder eigene Direktlinks).

---

## Inhaltsverzeichnis

1. [Architektur](#architektur)
2. [Projektstruktur](#projektstruktur)
3. [Installation auf Debian 12](#installation-auf-debian-12)
4. [Konfiguration (.env)](#konfiguration-env)
5. [Datenbank initialisieren](#datenbank-initialisieren)
6. [Admin-Benutzer anlegen](#admin-benutzer-anlegen)
7. [Entwicklung starten](#entwicklung-starten)
8. [Produktion mit PM2](#produktion-mit-pm2)
9. [Nginx Reverse Proxy](#nginx-reverse-proxy)
10. [HTTPS mit Let's Encrypt](#https-mit-lets-encrypt)
11. [REST-API-Übersicht](#rest-api-übersicht)
12. [Native iOS-App / WKWebView-Vorbereitung](#native-ios-app--wkwebview-vorbereitung)
13. [PWA](#pwa)
14. [Backup](#backup)
15. [Update / Deployment](#update--deployment)
16. [Ordnerrechte](#ordnerrechte)
17. [Troubleshooting](#troubleshooting)

---

## Architektur

```
Frontend (Vanilla-JS SPA, client/)
        │  fetch("/api/...")
        ▼
REST API (server/routes, server/controllers)
        ▼
Services (server/services) – Geschäftslogik
        ▼
SQLite-Datenbank (better-sqlite3, server/database)
        ▼
Dateispeicher: uploads/icons, uploads/screenshots, uploads/apps (IPAs)
```

- **Ein Node/Express-Prozess** liefert sowohl die statischen Frontend-Dateien als auch die REST-API und die hochgeladenen Dateien (`/uploads/...`) aus – ein einziger Port (Standard `3009`), den Nginx als Reverse Proxy nach außen absichert.
- Das Frontend ist eine **serverseitig geroutete SPA**: `GET /admin`, `GET /app/:id` usw. liefern alle dieselbe `index.html`, das clientseitige Routing (`client/scripts/router.js`) übernimmt danach die Navigation über die echte URL (`history.pushState`) – funktioniert identisch in Safari und in einer späteren `WKWebView`.
- Apps sind **nicht fest im Frontend verdrahtet**: Alles kommt dynamisch über `GET /api/apps` usw.

## Projektstruktur

```
demonicappstore_web/
├── server/
│   ├── config/          Zentrale .env-Konfiguration
│   ├── routes/          Express-Router (apps, categories, auth, admin)
│   ├── controllers/     Request/Response-Handling
│   ├── services/        Geschäftslogik + SQL-Zugriffe
│   ├── middleware/      Auth, CSRF, Rate-Limiting, Uploads, Sessions, Fehler
│   ├── database/        Schema-Migrationen, DB-Verbindung, Admin-CLI
│   └── utils/           Hilfsfunktionen (Slug, sichere Pfade, Validierung)
├── client/
│   ├── index.html       SPA-Shell
│   ├── styles/          Demonic-Dark-Theme (Tokens, Layout, Komponenten, Animationen)
│   ├── scripts/         Router, API-Client, Views, Admin-Panel
│   └── native/          nativeBridge.js – Abstraktion für die spätere iOS-App
├── uploads/              Icons, Screenshots, IPA-Dateien (nicht versioniert)
├── data/                 SQLite-Datenbankdatei (nicht versioniert)
├── tools/                generate-icons.js (App-Icons neu erzeugen)
├── nginx/                Beispiel-Reverse-Proxy-Konfiguration
├── ecosystem.config.js   PM2-Prozessdefinition
└── .env.example
```

## Installation auf Debian 12

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Build-Tools (für native Node-Module wie better-sqlite3/bcrypt)
sudo apt install -y curl git build-essential python3

# Node.js 20 LTS über NodeSource installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v   # sollte v20.x anzeigen
npm -v
```

Projekt beziehen und Abhängigkeiten installieren:

```bash
git clone <REPO-URL> demonic-app-store
cd demonic-app-store
npm install
```

## Konfiguration (.env)

```bash
cp .env.example .env
nano .env
```

Wichtige Werte:

| Variable | Bedeutung |
|---|---|
| `PORT` | Port, auf dem Node lauscht (Standard `3009`) |
| `BASE_URL` | Öffentliche HTTPS-URL, z. B. `https://das.thedemonlord333.me` |
| `DB_PATH` | Pfad zur SQLite-Datei |
| `SESSION_SECRET` | Langer, zufälliger String (z. B. `openssl rand -hex 32`) |
| `MAX_IPA_SIZE_MB` / `MAX_ICON_SIZE_MB` / `MAX_SCREENSHOT_SIZE_MB` | Upload-Limits |
| `TRUST_PROXY` | `1`, wenn hinter Nginx betrieben (Standard-Setup) |

**Niemals** die echte `.env` committen – sie ist bereits in `.gitignore` ausgeschlossen.

## Datenbank initialisieren

```bash
npm run migrate
```

Legt `data/store.db` an, führt alle Migrationen aus (`server/database/migrations/*.sql`) und legt die Standard-Kategorien (Games, Tools, Music, Media, Development, Other) an.

## Admin-Benutzer anlegen

```bash
npm run create-admin -- --username admin --password "EinSehrSicheresPasswort123!"
```

Ohne `--password` wird interaktiv (verdeckt) nach einem Passwort gefragt. Das Kommando kann jederzeit erneut ausgeführt werden, um das Passwort eines bestehenden Benutzers zurückzusetzen.

## Entwicklung starten

```bash
npm run dev
```

Startet den Server mit `nodemon` auf `http://localhost:3009`. Die Migration läuft automatisch beim Start.

## Produktion mit PM2

```bash
sudo npm install -g pm2

npm run migrate
npm run create-admin -- --username admin

pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Ausgabe des Befehls ausführen, damit PM2 beim Boot startet
```

Nützliche PM2-Befehle:

```bash
pm2 status
pm2 logs demonic-app-store
pm2 restart demonic-app-store
```

## Nginx Reverse Proxy

```bash
sudo apt install -y nginx
sudo cp nginx/demonic-app-store.conf /etc/nginx/sites-available/demonic-app-store.conf
sudo ln -s /etc/nginx/sites-available/demonic-app-store.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Passe in der Datei `server_name` an deine Domain an. `client_max_body_size` ist bereits für große IPA-Uploads hochgesetzt.

## HTTPS mit Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d das.thedemonlord333.me
```

Certbot passt die Nginx-Konfiguration automatisch an und richtet die automatische Zertifikatserneuerung ein (Timer/Cronjob wird von `certbot` selbst installiert). Test der Erneuerung:

```bash
sudo certbot renew --dry-run
```

## REST-API-Übersicht

**Öffentlich:**

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/apps` | Liste aller aktiven Apps (Filter: `?category=`, `?q=`) |
| GET | `/api/apps/:id` | Detailinformationen inkl. Versionen & Screenshots |
| GET | `/api/apps/:id/versions` | Versionsverlauf |
| GET | `/api/apps/:id/manifest` | Dynamisch generiertes iOS-OTA-Manifest (itms-services) |
| GET | `/api/categories` | Kategorienliste |

**Auth:**

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/login` | Login (Rate-Limited) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Aktuelle Session + CSRF-Token |

**Admin** (Session + `X-CSRF-Token`-Header erforderlich):

| Methode | Pfad |
|---|---|
| GET/POST | `/api/admin/apps` |
| PUT/DELETE | `/api/admin/apps/:id` |
| POST | `/api/admin/apps/:id/icon` |
| POST | `/api/admin/apps/:id/screenshots` |
| DELETE | `/api/admin/apps/:id/screenshots/:screenshotId` |
| POST | `/api/admin/apps/:id/versions` |
| PUT/DELETE | `/api/admin/apps/:id/versions/:versionId` |
| POST | `/api/admin/apps/:id/versions/:versionId/publish` |
| POST | `/api/admin/apps/:id/versions/:versionId/ipa` |
| POST/PUT/DELETE | `/api/admin/categories[/:slug]` |

Das CSRF-Token wird beim Login im JSON-Response mitgeliefert und muss vom Client bei allen zustandsändernden Admin-Anfragen im Header `X-CSRF-Token` mitgeschickt werden (siehe `client/scripts/api.js`).

## Native iOS-App / WKWebView-Vorbereitung

`client/native/nativeBridge.js` ist die einzige Stelle im Frontend, die weiß, ob die Seite gerade in Safari oder in der späteren nativen App läuft. Die native App (nicht Teil dieses Repos) kann optional vor dem Laden der Seite ein Objekt `window.DemonicNative` injizieren, um native Zusatzfunktionen bereitzustellen (installierte Versionen, native Installations-/Öffnen-Aktionen). Ohne dieses Objekt funktioniert die Web-Version vollständig über Browser-Fallbacks (z. B. Öffnen der `installUrl`).

Der Vertrag ist ausführlich als Kommentar am Anfang von `nativeBridge.js` dokumentiert.

## PWA

Die Seite ist als Progressive Web App vorbereitet (`client/manifest.webmanifest`, `client/service-worker.js`, Icons in `client/icons/`). Auf dem iPhone: Safari → Teilen → "Zum Home-Bildschirm". App-Icons können mit einer eigenen Grafik ersetzt oder mit

```bash
npm run generate-icons
```

neu aus dem eingebauten "D"-Monogramm generiert werden (`tools/generate-icons.js`).

## Backup

Zu sichern sind:

```bash
data/store.db         # Datenbank
uploads/               # Icons, Screenshots, IPA-Dateien
.env                   # Konfiguration/Secrets
```

Beispiel für ein einfaches, komprimiertes Backup:

```bash
tar -czf demonic-backup-$(date +%Y%m%d-%H%M).tar.gz data uploads .env
```

Empfehlenswert: dieses Kommando als tägliches Cronjob einrichten und die Archive extern lagern (z. B. via `rsync`/Object Storage).

## Update / Deployment

```bash
cd /pfad/zu/demonic-app-store
git pull
npm install
npm run migrate
pm2 restart demonic-app-store
```

Da Frontend-Änderungen über denselben Server ausgeliefert werden, sieht sowohl der Browser als auch die spätere WKWebView-App die neue Version beim nächsten Laden – für reine Design-/Store-Änderungen ist **kein neuer App-Store-Build nötig**. Der Service Worker liefert Navigationsanfragen "Network First" aus, sodass Deployments zeitnah sichtbar werden; bei Bedarf `CACHE_VERSION` in `client/service-worker.js` erhöhen, um alte Caches hart zu invalidieren.

## Ordnerrechte

Falls der Node-Prozess unter einem eigenen Systemnutzer läuft (empfohlen):

```bash
sudo useradd -r -s /usr/sbin/nologin demonicapp
sudo chown -R demonicapp:demonicapp /pfad/zu/demonic-app-store/data /pfad/zu/demonic-app-store/uploads /pfad/zu/demonic-app-store/logs
sudo chmod -R 750 /pfad/zu/demonic-app-store/data /pfad/zu/demonic-app-store/uploads
```

PM2 dann z. B. über einen systemd-Service unter diesem Benutzer starten (`pm2 startup` bietet das entsprechende Kommando an).

## Troubleshooting

**Server startet nicht / Port belegt**
```bash
sudo lsof -i :3009
```
Port in `.env` ändern oder blockierenden Prozess beenden.

**`better-sqlite3` Installationsfehler**
Meist fehlende Build-Tools:
```bash
sudo apt install -y build-essential python3
rm -rf node_modules package-lock.json
npm install
```

**Admin-Login schlägt fehl**
- Prüfen, ob `npm run migrate` und `npm run create-admin` ausgeführt wurden.
- Rate-Limit: nach zu vielen Fehlversuchen kurz warten (`LOGIN_RATE_LIMIT_MAX` in `.env`).

**Upload schlägt mit 400/413 fehl**
- `MAX_IPA_SIZE_MB` in `.env` und `client_max_body_size` in der Nginx-Config müssen zusammenpassen.
- Nur `.ipa`-Dateien (mit gültiger ZIP-Signatur) werden als IPA akzeptiert, Icons/Screenshots nur als PNG/JPEG/WebP.

**Änderungen am Frontend erscheinen nicht**
- Browser-Cache/Service-Worker: harte Neuladen (Shift+Reload) oder `CACHE_VERSION` in `client/service-worker.js` erhöhen und neu deployen.

**"itms-services"-Installation funktioniert nicht**
- Erfordert HTTPS mit gültigem Zertifikat (kein Self-Signed) und eine korrekt signierte IPA für die jeweilige Verteilungsmethode (Ad-hoc/In-House). Prüfe `BASE_URL` in `.env` sowie die Bundle-ID/Version der App.
