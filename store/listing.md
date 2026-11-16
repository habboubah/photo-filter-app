# Store listing — Einkaufsliste – ganz einfach

Everything to copy into **App Store Connect** and the **Google Play Console**, in
German (primary), English and Arabic. Every text below fits the store's limit
(counted on 14 November 2026). The descriptions match the app after the
"Knete" redesign, which added the basket, the "next item" card in shopping mode
and the two counts on home.

The code name is **shoppinglist** (it was "Korb" until 14 November 2026). The
old name stays only in the bundle ID / package `com.habboubah.korb`. The
privacy and share pages live under `…/privacy-policy/shopping-list/` (renamed
from `korb/` on 14 November 2026).

---

## 1. Shared facts (both stores)

| Field | Deutsch | English | العربية |
|---|---|---|---|
| App name (30) | `Einkaufsliste – ganz einfach` | `Shopping List – Nice & Easy` | `قائمة مشتريات التسوق البسيطة` |
| Home-screen / launcher name | Einkaufsliste | Shopping List | قائمة التسوق |
| Category | Shopping (secondary on iOS: Productivity) | same | same |
| Price | Free. No in-app purchases | same | same |
| Privacy policy URL | https://habboubah.github.io/privacy-policy/shopping-list/de/ | https://habboubah.github.io/privacy-policy/shopping-list/ | https://habboubah.github.io/privacy-policy/shopping-list/ |
| Support URL | https://habboubah.github.io/privacy-policy/shopping-list/de/ | https://habboubah.github.io/privacy-policy/shopping-list/ | https://habboubah.github.io/privacy-policy/shopping-list/ |
| Contact email | ahmad.habboubah@gmail.com | same | same |
| Copyright | `2026 Ahmad Habboubah` | same | same |

The home-screen name comes from the app itself (iOS `InfoPlist.strings`,
Android `strings.xml`). You don't type it into either console.

---

## 2. Apple App Store

### 2.1 Name, subtitle, keywords

| Field | Limit | Deutsch (primary) | English (U.K.) | العربية |
|---|---|---|---|---|
| Name | 30 | `Einkaufsliste – ganz einfach` | `Shopping List – Nice & Easy` | `قائمة مشتريات التسوق البسيطة` |
| Subtitle | 30 | `Einkaufszettel zum Abhaken` | `Grocery list to tick off` | `قائمة مشتريات بلا تسجيل` |

**Keywords** (100 bytes, comma-separated, no spaces after commas):

- **DE:** `einkaufen,liste,teilen,familie,offline,privat,haushalt,supermarkt,drogerie,lebensmittel,anmeldung`
- **EN:** `groceries,grocery,checklist,share,family,offline,private,supermarket,pantry,basket,food,todo,no account`
- **AR:** `بقالة,سوبرماركت,مقاضي,مشاركة,عائلة,طعام,تسوق`

Rules followed: no word repeated from the name or subtitle (Apple already
combines those), no "kostenlos" / "free" / "best", no other app names
(guideline 2.3.7). The Arabic field is short because Arabic letters take
2 bytes each.

### 2.2 Promotional text (170, can be changed any time without review)

**DE:**
```
Zuhause schreiben, im Laden abhaken. Für jeden Laden eine Liste mit Bildern, über 400 Artikel zum Antippen – ohne Konto, alles bleibt auf deinem Gerät.
```

**EN:**
```
Write it at home, tick it off in the shop. A list for every shop with pictures and 400+ items to tap – no account, everything stays on your device.
```

**AR:**
```
اكتبها في البيت واشطبها في المتجر. قائمة لكل متجر مع صور وأكثر من 400 غرض بنقرة واحدة – بلا حساب، وكل شيء يبقى على جهازك.
```

### 2.3 Description (4000)

**DE:**
```
Einkaufsliste – ganz einfach: zuhause schreiben, im Laden abhaken. Kostenlos, ohne Abo und ohne Anmeldung – alles bleibt auf deinem Gerät.

FÜR JEDEN LADEN EINE LISTE
Supermarkt, Drogerie, Kleidung, Baumarkt … Jede Einkaufsliste bekommt ihre eigene Farbe und ein Bild – ein Emoji oder dein eigenes Foto. Auf dem Startbildschirm siehst du sofort, was noch zu kaufen ist und was schon im Korb liegt.

SCHNELL HINZUFÜGEN
Über 400 typische Artikel mit Bild, passend zur Liste: im Supermarkt Milch, Brot und Bananen, in der Drogerie Zahnpasta und Windeln. Was du oft kaufst, steht ganz vorne. Tippe einfach „2 kg Äpfel“ oder „Milch 3x“ – die App erkennt die Menge. Doppelte Einträge gibt es nicht: Steht etwas schon auf dem Einkaufszettel, wird die Menge erhöht.

NACH REGALEN SORTIERT
Obst und Gemüse, Milchprodukte, Vorrat: Die Liste ordnet sich so, wie du durch den Laden gehst.

IM LADEN ABHAKEN
Der Einkaufsmodus zeigt dir den nächsten Artikel als große Karte – „In den Korb“ oder „Später“. Der Korb füllt sich, während du einkaufst, und der Bildschirm bleibt an. Abgehakte Artikel landen im Korb; ein Tipp legt sie zurück auf die Liste.

LISTEN TEILEN
Schick eine Einkaufsliste als Link über WhatsApp, Nachrichten oder Mail. Wer sie bekommt, fügt sie einfach in der App ein und speichert sie als eigene Liste – ganz ohne Server.

DEINE VORSCHLÄGE
Eigene Listentypen anlegen, Vorschläge hinzufügen, umbenennen oder löschen. Und jederzeit zurück zum Standard.

DEIN STIL
Hell, dunkel oder automatisch, große Schrift und VoiceOver.

PRIVAT
Kein Konto, keine Cloud, kein Tracking, kein Internet nötig. Deine Listen bleiben auf deinem Gerät. Mit Backup-Export als Datei.

Auf Deutsch, Englisch und Arabisch.
```

**EN:**
```
Shopping List – Nice & Easy: write it at home, tick it off in the shop. Free, with no subscription and no sign-up – everything stays on your device.

ONE LIST PER SHOP
Supermarket, drugstore, clothes, DIY … Every shopping list gets its own colour and picture – an emoji or your own photo. The start screen shows at a glance what is still to buy and what is already in the basket.

FAST TO FILL
Over 400 common items with pictures, matched to the list: milk, bread and bananas for the supermarket, toothpaste and nappies for the drugstore. What you buy most comes first. Just type "2 kg apples" or "milk 3x" – the app reads the quantity. No duplicates: if something is already on the list, its quantity goes up.

SORTED BY AISLE
Fruit and veg, dairy, pantry: your grocery list arranges itself the way you walk through the shop.

TICK IT OFF IN THE SHOP
Shopping mode shows the next item as a big card – "Into the basket" or "Later". The basket fills up as you shop, and the screen stays on. Ticked items drop into the basket; one tap puts them back on the list.

SHARE A LIST
Send a list as a link through WhatsApp, Messages or mail. Whoever gets it pastes it into the app and saves it as their own list – with no server involved.

YOUR SUGGESTIONS
Create your own list types, add, rename or delete suggestions – and restore the defaults any time.

YOUR STYLE
Light, dark or automatic, large text and VoiceOver.

PRIVATE
No account, no cloud, no tracking, no internet needed. Your lists stay on your device, with backup export to a file.

In German, English and Arabic.
```

**AR:**
```
قائمة مشتريات التسوق البسيطة: اكتبها في البيت واشطبها في المتجر. مجانية، بلا اشتراك ولا تسجيل – وكل شيء يبقى على جهازك.

قائمة لكل متجر
سوبرماركت، صيدلية ومستلزمات، ملابس، أدوات بناء… لكل قائمة مشتريات لونها وصورتها – رمز تعبيري أو صورة من عندك. وترى في الشاشة الرئيسية فوراً ما بقي للشراء وما صار في السلة.

إضافة سريعة
أكثر من 400 غرض شائع مع صورة، مناسبة لكل قائمة: حليب وخبز وموز للسوبرماركت، معجون أسنان وحفاضات للصيدلية. ما تشتريه كثيراً يظهر أولاً. اكتب «2 كيلو تفاح» أو «حليب 3x» وسيفهم التطبيق الكمية. لا تكرار: إن كان الغرض موجوداً تزداد كميته.

مرتّبة حسب الأقسام
خضار وفواكه، ألبان، مؤن: تترتب القائمة كما تمشي في المتجر.

اشطبها في المتجر
وضع التسوق يعرض الغرض التالي كبطاقة كبيرة – «إلى السلة» أو «لاحقاً». تمتلئ السلة وأنت تتسوق، وتبقى الشاشة مضاءة. الأغراض المشطوبة تنزل في السلة، ونقرة واحدة تعيدها إلى القائمة.

مشاركة القوائم
أرسل قائمة كرابط عبر واتساب أو الرسائل أو البريد. من يستلمها يلصقها في التطبيق ويحفظها قائمةً خاصة به – بلا أي خادم.

اقتراحاتك
أنشئ أنواع قوائم خاصة بك، وأضف الاقتراحات أو عدّلها أو احذفها، وعُد إلى الأصل متى شئت.

مظهرك
فاتح أو داكن أو تلقائي، وخط كبير وVoiceOver.

خصوصية
لا حساب، لا سحابة، لا تتبّع، ولا حاجة إلى الإنترنت. قوائمك تبقى على جهازك، مع تصدير نسخة احتياطية كملف.

بالعربية والألمانية والإنجليزية، من اليمين إلى اليسار.
```

### 2.4 What's New (4000)

The first App Store version shows no What's New. Use these for the first
update (1–3 short lines per release):

- **DE:** `Neuer Look in den Farben des App-Symbols: Was du abhakst, hüpft in die Tüte. Dazu ein Korb für alles Abgehakte und im Einkaufsmodus immer der nächste Artikel groß im Blick.`
- **EN:** `A new look in the colours of the app icon: what you tick hops into the bag. Plus a basket for everything you've ticked off, and shopping mode always shows the next item big and clear.`
- **AR:** `مظهر جديد بألوان أيقونة التطبيق: ما تشطبه يقفز إلى الكيس. ومعه سلة لكل ما شطبته، ووضع التسوق يعرض الغرض التالي بوضوح.`

If TestFlight testers knew the app as "Korb":

- **DE:** `Neuer Name: Einkaufsliste – ganz einfach. Deine Listen bleiben, wie sie sind.`
- **EN:** `A new name: Shopping List – Nice & Easy. Your lists stay exactly as they are.`
- **AR:** `اسم جديد: قائمة مشتريات التسوق البسيطة. قوائمك تبقى كما هي.`

### 2.5 App Review information

| Field | Value |
|---|---|
| Sign-in required | **No** (leave the demo account empty) |
| Contact first / last name | Ahmad Habboubah |
| Contact email | ahmad.habboubah@gmail.com |
| Contact phone | *your phone number, with +49* |
| Attachment | Not needed (add a screen recording only if review asks: `npm run record:app-review`, see `ios/AppReviewRecorder/README.md`) |

**Notes for the reviewer** (English, paste as is):
```
Shopping List – Nice & Easy (German: "Einkaufsliste – ganz einfach") is a fully offline shopping list. There is no account, no server and no analytics; the app makes no network requests.

How to try it:
1. Open a list on the home screen (or tap "New list").
2. Tap a suggestion or type e.g. "2 kg apples" in the field at the top.
3. Tap "Start shopping" to open shopping mode and tick items off; ticked items move into the basket.

Camera / photo library: used only when the user chooses a photo for a list or an item. The photo is stored on the device only.

Sharing: "Share list" puts the list into a message with a link and hands it to the system share sheet. The app itself sends nothing. The receiver copies the message and taps "New list" > "Paste shared list" to save it; the link also opens a static page (habboubah.github.io). Reading the clipboard happens only when the user taps "Paste from clipboard".

The app is in German, English and Arabic and follows the device language.
```

### 2.6 App Privacy (the "nutrition label")

- **Data collection:** choose **"No, we do not collect data from this app."**
  Result: **Data Not Collected**.
- **Privacy policy URL:** see section 1.

### 2.7 Age rating

Answer **None / No** to every question in the questionnaire (no violence, no
mature content, no gambling, no user-generated content shown to others, no
unrestricted web access, no in-app chat). Result: **4+**.

### 2.8 Other App Store Connect fields

| Field | Answer |
|---|---|
| Content rights ("contains third-party content?") | No |
| Export compliance / encryption | Uses no encryption beyond Apple's own → "None of the algorithms mentioned above". Best: set `ITSAppUsesNonExemptEncryption` = `NO` in `Info.plist` so the question doesn't come up for each build |
| Advertising identifier (IDFA) | No |
| Availability | All countries (or at least DE, AT, CH, GB, US and the Arabic-speaking countries) |
| Pricing | Free (tier 0) |
| Marketing URL | Optional — leave empty |
| Version | 1.0 (or whatever `npm run release` sets) |

### 2.9 App Store graphics

| Asset | Size | Note |
|---|---|---|
| App icon | 1024 × 1024 PNG, no transparency, no rounded corners | Comes from the Xcode asset catalogue |
| iPhone screenshots | **6.9"**: 1320 × 2868 (or 1290 × 2796), 3–10 per language | One 6.9" set is enough; Apple scales it for smaller iPhones |
| iPad screenshots | 13": 2064 × 2752 | **Only if iPad is enabled** in Xcode (Capacitor projects are universal by default). If you don't want to make iPad screenshots, set the target to iPhone only |
| App preview video | 886 × 1920, 15–30 s, H.264 with a stereo audio track; up to 3 per language | Optional. `npm run app-preview` on the Mac → `screenshots/store/app-preview/app-preview-<de\|en>.mp4` (about 28 s; Arabic falls back to English). After the upload, set the poster frame to the time the run prints |

Arabic can reuse the English screenshots if you don't make an Arabic set.

---

## 3. Google Play

### 3.1 Main store listing

| Field | Limit | Deutsch (default) | English (United Kingdom) | العربية |
|---|---|---|---|---|
| App name | 30 | `Einkaufsliste – ganz einfach` | `Shopping List – Nice & Easy` | `قائمة مشتريات التسوق البسيطة` |
| Short description | 80 | `Einkaufszettel zum Abhaken & Teilen – ohne Anmeldung, funktioniert offline.` | `Grocery list to tick off & share – no sign-up, works offline.` | `قائمة مشتريات تشطبها وتشاركها – بلا تسجيل، وتعمل دون إنترنت.` |

Play has no keyword field: it searches the name, the short and the full
description. The texts say *Einkaufsliste* / *Einkaufszettel* a few times in
natural sentences; more would count as keyword stuffing. No "kostenlos",
"free", "best" or "#1" in the name or short description.

### 3.2 Full description (4000)

**DE:**
```
Einkaufsliste – ganz einfach: zuhause schreiben, im Laden abhaken. Kostenlos, ohne Abo und ohne Anmeldung. Alles bleibt auf deinem Gerät.

FÜR JEDEN LADEN EINE LISTE
Supermarkt, Drogerie, Kleidung, Baumarkt … Jede Einkaufsliste bekommt ihre eigene Farbe und ein Bild – ein Emoji oder dein eigenes Foto. Auf dem Startbildschirm siehst du sofort, was noch zu kaufen ist und was schon im Korb liegt.

SCHNELL HINZUFÜGEN
Über 400 typische Artikel mit Bild, passend zur Liste: im Supermarkt Milch, Brot und Bananen, in der Drogerie Zahnpasta und Windeln. Was du oft kaufst, steht ganz vorne. Tippe einfach „2 kg Äpfel“ oder „Milch 3x“ – die App erkennt die Menge. Doppelte Einträge gibt es nicht: Steht etwas schon auf dem Einkaufszettel, wird die Menge erhöht.

NACH REGALEN SORTIERT
Obst und Gemüse, Milchprodukte, Vorrat: Die Liste ordnet sich so, wie du durch den Laden gehst.

IM LADEN ABHAKEN
Der Einkaufsmodus zeigt dir den nächsten Artikel als große Karte – „In den Korb“ oder „Später“. Der Korb füllt sich, während du einkaufst, und der Bildschirm bleibt an. Abgehakte Artikel landen im Korb; ein Tipp legt sie zurück auf die Liste.

LISTEN TEILEN
Schick eine Einkaufsliste als Link über WhatsApp, Nachrichten oder Mail. Wer sie bekommt, fügt sie einfach in der App ein und speichert sie als eigene Liste – ganz ohne Server.

DEINE VORSCHLÄGE
Eigene Listentypen anlegen, Vorschläge hinzufügen, umbenennen oder löschen. Und jederzeit zurück zum Standard.

DEIN STIL
Hell, dunkel oder automatisch, große Schrift.

PRIVAT
Kein Konto, keine Cloud, kein Tracking, keine Google-Dienste, kein Internet nötig. Deine Listen bleiben auf deinem Gerät. Mit Backup-Export als Datei.

Auf Deutsch, Englisch und Arabisch (von rechts nach links).
```

**EN:**
```
Shopping List – Nice & Easy: write it at home, tick it off in the shop. Free, with no subscription and no sign-up. Everything stays on your device.

ONE LIST PER SHOP
Supermarket, drugstore, clothes, DIY … Every shopping list gets its own colour and picture – an emoji or your own photo. The start screen shows at a glance what is still to buy and what is already in the basket.

FAST TO FILL
Over 400 common items with pictures, matched to the list: milk, bread and bananas for the supermarket, toothpaste and nappies for the drugstore. What you buy most comes first. Just type "2 kg apples" or "milk 3x" – the app reads the quantity. No duplicates: if something is already on the list, its quantity goes up.

SORTED BY AISLE
Fruit and veg, dairy, pantry: your grocery list arranges itself the way you walk through the shop.

TICK IT OFF IN THE SHOP
Shopping mode shows the next item as a big card – "Into the basket" or "Later". The basket fills up as you shop, and the screen stays on. Ticked items drop into the basket; one tap puts them back on the list.

SHARE A LIST
Send a list as a link through WhatsApp, Messages or mail. Whoever gets it pastes it into the app and saves it as their own list – with no server involved.

YOUR SUGGESTIONS
Create your own list types, add, rename or delete suggestions – and restore the defaults any time.

YOUR STYLE
Light, dark or automatic, large text.

PRIVATE
No account, no cloud, no tracking, no Google services, no internet needed. Your lists stay on your device, with backup export to a file.

In German, English and Arabic (right to left).
```

**AR:**
```
قائمة مشتريات التسوق البسيطة: اكتبها في البيت واشطبها في المتجر. مجانية، بلا اشتراك ولا تسجيل. كل شيء يبقى على جهازك.

قائمة لكل متجر
سوبرماركت، صيدلية ومستلزمات، ملابس، أدوات بناء… لكل قائمة مشتريات لونها وصورتها – رمز تعبيري أو صورة من عندك. وترى في الشاشة الرئيسية فوراً ما بقي للشراء وما صار في السلة.

إضافة سريعة
أكثر من 400 غرض شائع مع صورة، مناسبة لكل قائمة. ما تشتريه كثيراً يظهر أولاً. اكتب «2 كيلو تفاح» أو «حليب 3x» وسيفهم التطبيق الكمية. لا تكرار: إن كان الغرض موجوداً تزداد كميته.

مرتّبة حسب الأقسام
خضار وفواكه، ألبان، مؤن: تترتب قائمة التسوق كما تمشي في المتجر.

اشطبها في المتجر
وضع التسوق يعرض الغرض التالي كبطاقة كبيرة – «إلى السلة» أو «لاحقاً». تمتلئ السلة وأنت تتسوق، وتبقى الشاشة مضاءة. الأغراض المشطوبة تنزل في السلة، ونقرة واحدة تعيدها إلى القائمة.

مشاركة القوائم
أرسل قائمة كرابط عبر واتساب أو الرسائل أو البريد. من يستلمها يلصقها في التطبيق ويحفظها قائمةً خاصة به – بلا أي خادم.

اقتراحاتك
أنشئ أنواع قوائم خاصة بك، وأضف الاقتراحات أو عدّلها أو احذفها، وعُد إلى الأصل متى شئت.

مظهرك
فاتح أو داكن أو تلقائي، وخط كبير.

خصوصية
لا حساب، لا سحابة، لا تتبّع، لا خدمات Google، ولا حاجة إلى الإنترنت. قوائمك تبقى على جهازك، مع تصدير نسخة احتياطية كملف.

بالعربية والألمانية والإنجليزية (من اليمين إلى اليسار).
```

### 3.3 Store settings

| Field | Answer |
|---|---|
| App or game | App |
| Category | **Shopping** |
| Tags | Shopping list, Grocery (pick up to 5 from Google's list) |
| Contact email | ahmad.habboubah@gmail.com |
| Website / phone | Optional — website: https://habboubah.github.io/privacy-policy/shopping-list/ |
| Free or paid | **Free** (can never be changed to paid later) |
| Countries | All, or the same as the App Store |

### 3.4 Data safety form

- **Does your app collect or share any of the required user data types?** → **No**
- Nothing leaves the device: no server, no analytics, no Google
  services. Photos added to a list or item stay on the phone. A shared list is
  sent by the user, through the app they choose, inside a link. The app itself
  sends nothing.
- **Encrypted in transit?** → Not applicable (no data sent)
- **Way to request data deletion?** → Not applicable (no account).
  *Einstellungen › App zurücksetzen* erases everything on the device.

### 3.5 App content (Policy › App content)

| Question | Answer |
|---|---|
| Privacy policy | https://habboubah.github.io/privacy-policy/shopping-list/ |
| Ads | Answer for the version you submit: **No** while the app shows none, **Yes** from the release that adds them (Play then labels the listing "Contains ads") |
| App access | **All functionality is available without special access** (no sign-in) |
| Content rating | Questionnaire, category *"All other app types"* (utility). Answer **No** to violence, sexuality, language, drugs, gambling, user interaction / sharing with other users, location sharing, digital purchases → rated **Everyone / PEGI 3 / USK 0** |
| Target audience | **18 and over** (13+ also fits). Not for children; "Could appeal to children?" → No |
| News app | No |
| Health apps | No |
| Financial features | None |
| Government app | No |
| Data safety | See 3.4 |

### 3.6 Release notes (500 per language)

First release:

- **de-DE:** `Die erste Version von „Einkaufsliste – ganz einfach“ für Android: eine Liste für jeden Laden, über 400 Artikel mit Bild, Einkaufsmodus mit Korb – ohne Konto.`
- **en-GB:** `The first version of Shopping List – Nice & Easy for Android: a list for every shop, over 400 items with pictures, shopping mode with a basket – no account.`
- **ar:** `أول إصدار من قائمة مشتريات التسوق البسيطة لأندرويد: قائمة لكل متجر، أكثر من 400 غرض مع صور، ووضع التسوق مع السلة – بلا حساب.`

`npm run release` reads these from `release-notes/<version>/<language>.txt`
(or `release-notes/default/`).

### 3.7 Google Play graphics

| Asset | Size | Source |
|---|---|---|
| App icon | 512 × 512 PNG (32-bit, alpha allowed) | `public/icon-512.png` |
| Feature graphic | 1024 × 500 JPG or PNG, no transparency | `screenshots/store/play-feature/<de|en>/feature-graphic.jpg` |
| Phone screenshots | 2–8, 9:16, e.g. 1080 × 1920 (4+ at 1080 px or more to be eligible for featuring) | `screenshots/store/play-phone/<de|en>/` |
| Tablet screenshots | Optional | — |

---

## 4. Before you submit

- [ ] **Regenerate all screenshots in the Tüte look**:
      `npm run screenshots && npm run store-screenshots` on the Mac (the
      colours in `.claude/skills/store-screenshot-studio/config/theme.json`
      are already the new ones).
- [ ] **Publish the privacy pages and the share page** again in the
      `privacy-policy` repo, so they show the new names and the
      *On Android* section. Until the share page is live, a shared link opens a 404
      (pasting the message into the app still works).
- [x] **Names reserved in App Store Connect** (15 November 2026) for German,
      English (U.S.) and Arabic, with the subtitles. The first names
      (*Die einfache Einkaufsliste*, *The Simple Shopping List*) were taken.
      Still to do: + English (U.K.) in App Store Connect, and the same names
      in the Play Console when you create the app.
- [ ] **Decide iPhone-only or iPad too** (section 2.9).
- [ ] Set `ITSAppUsesNonExemptEncryption` = `NO` in `Info.plist`.
- [ ] After the app is live, fill in `APP_STORE_ID` in `src/links.ts`, so the
      "rate the app" row appears.
- [ ] **Google Play closed test:** if your Play developer account is a personal
      account created after 13 Nov 2023, each new app needs a closed test with
      **at least 12 testers opted in for 14 days in a row** before you can
      apply for production. Internal testing doesn't count. Check *Publishing
      overview* in the Play Console for this app; plan about 3 weeks for it.
