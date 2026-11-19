# Store listing — Bildklar KI: Fotos aufräumen

Everything to copy into **App Store Connect** and the **Google Play Console**,
in German (primary), English and Arabic. Every text below fits the store's limit
(counted with `node scripts/listing-lengths.mjs` — run it again after editing).
The texts of 18 November 2026 (late evening) put **privacy first**, after a
second look at the other cleaners on both stores (TidyHero, Slean, Clean Up,
Clean Kit, Swipe & Tidy, Clever Cleaner, Cleanup, CleanMy®Phone, Play's
offline duplicate finders). "Your photos never leave your device" is now in
nearly every listing, so on its own it no longer sets Bildklar apart. What
does is saying it in ways the reader can check: **we** can't see your photos
(no server, no account, no upload); it works **completely offline**, the AI
and the place names too — "try it in airplane mode"; the App Store label says
*Data Not Collected*; and **for now everything is free, with no ads** — most
of the others are subscriptions with a thin free tier (Clever Cleaner is the
one that wins on "free, no ads", and it doesn't say offline). So every
description opens with "Wir sehen deine Fotos nie", then three short blocks
(your photos stay with you · free and no ads · you have the last word), then
what the others don't have: trips that become albums/folders, side by side
with one zoom, search by what is in a photo, chats sorted by app. Still no
"speed up" or "junk" claims (the app can't keep them).
"Offline" / "ohne Internet" is true and checked (`npm run check:privacy`: the
app makes no request at all; a restore of the purchase only on a tap) — but
never "no internet permission": Android's Billing Library brings it
(`docs/ANDROID_RELEASE.md`). **When the unlock goes on sale**, the "for now
everything is free" lines (promotional text, the descriptions) change with it.
The Arabic texts are new and Claude's: please read them once before they go in.

Both stores get **the same description** (2.3, since 19 November 2026), so
it names neither iPhone nor Android and says only what is true on both.
What differs stays where it must: the App Store's subtitle, keywords and
promotional text, Play's short description.

**The launch phase (now).** Nothing is for sale yet (`UNLOCK_ON_SALE` is
`false` in `src/logic/allowance.ts`): deleting has no limit, and since
18 November 2026 albums / folders, smaller videos and photos and Live Photos
as stills are free in the app too. The texts below say that everything is
free *for now* and mention no purchase. The versions
that do — for the day the unlock goes on sale — are in git history (this
file before 17 November 2026): bring back those sections, the album slide
and the album scene together with the switch.

---

## 1. Shared facts (both stores)

| Field | Deutsch | English |
|---|---|---|
| App name (30) | `Bildklar KI: Fotos aufräumen` | `Bildklar AI: Photo Cleaner` |
| Home-screen / launcher name | Bildklar | Bildklar |
| Bundle ID / package | `com.habboubah.bildklar` | same |
| Category | iOS: **Photo & Video** (secondary: Utilities) · Play: **Photography** | same |
| Price | Free download, **no in-app purchase yet** (the launch phase, see above) | same |
| In-app purchase (later) | `com.habboubah.bildklar.unlock` — non-consumable / one-time product, **4,99 €**; created in both consoles, **not** submitted / activated until the unlock goes on sale | same |
| Privacy policy URL | https://habboubah.github.io/privacy-policy/bildklar/de/ | https://habboubah.github.io/privacy-policy/bildklar/ |
| Support URL | https://habboubah.github.io/privacy-policy/bildklar/de/ | https://habboubah.github.io/privacy-policy/bildklar/ |
| Contact email | ahmad.habboubah@gmail.com | same |
| Copyright | `2026 Ahmad Habboubah` | same |
| Minimum OS | iOS 16 · Android 11 | same |

**What is free, what is paid.** Now everything the app shows is free, and
deleting has no limit. Later the unlock (one purchase, no subscription) will
pay for albums/folders, smaller videos and photos, Live Photos as stills and
deleting beyond the first 50 photos — but installs from the launch phase keep
deleting without a limit (`AppState.early`).

**Rules for every text and image:** no price and no "kostenlos/free" in the
name, subtitle, keywords or screenshots (App Store guideline 2.3.7, Play's
metadata policy — the store shows the price itself; the promotional text and
the descriptions may say it); no other app names; no claims the app can't
keep ("deletes duplicates automatically", "no internet permission" — "works
offline" / "ohne Internet" is true and fine).

---

## 2. Apple App Store

### 2.1 Name, subtitle, keywords

| Field | Limit | Deutsch (primary) | English (U.K. and U.S.) |
|---|---|---|---|
| Name | 30 | `Bildklar KI: Fotos aufräumen` | `Bildklar AI: Photo Cleaner` |
| Subtitle | 30 | `Doppelte Fotos – 100% offline` | `Duplicate photos, 100% offline` |

The subtitle names the search people type most ("doppelte Fotos" /
"duplicate photos") and the promise a reader can check: it works offline
(nothing leaves the phone because nothing *can*). The trip albums — the thing
no other cleaner does — moved to the description's first lines and the
keywords. Before 18 November 2026 (late evening): `Doppelte Fotos & Reisealben`.

The German name was `Bildklar KI: Foto Reiniger` until 19 November 2026:
the app organizes as much as it cleans, and "aufräumen" says both. "Reiniger"
moved into the German keywords so the search for it still finds Bildklar.

**Keywords** (100 bytes, comma-separated, no spaces after commas):

- **DE:** `duplikate,ähnlich,unscharf,speicher,löschen,reiniger,privat,datenschutz,urlaub,reise,album,kinder`
- **EN:** `similar,blurry,storage,space,delete,clean,private,privacy,trip,travel,album,vacation,kids,family`

Rules followed: no word repeated from the name or subtitle (Apple combines
them already), no "kostenlos" / "free" / "best", no other app names.

**Arabic** (an *Arabic* localization in App Store Connect; the app has spoken
Arabic since 17 November 2026 — Ahmad, please read it once as a native speaker):

| Field | Limit | العربية |
|---|---|---|
| Name | 30 | `Bildklar: منظّف الصور الذكي` |
| Subtitle | 30 | `الصور المكرّرة – دون إنترنت` |

- **AR:** `ضبابية,مشابهة,مساحة,خصوصية,رحلات,ألبوم,أطفال,تنظيف,حذف`

### 2.2 Promotional text (170, can be changed any time without review)

**DE:**
```
Wir sehen deine Fotos nie: Bildklar arbeitet nur auf deinem Handy, auch ohne Internet. Im Moment kostenlos – ohne Werbung, ohne Abo, ohne Konto. Du entscheidest.
```

**EN:**
```
We never see your photos: Bildklar works only on your phone, even offline. Free for now – no ads, no subscription, no account. You decide what stays.
```

**AR:**
```
لا نرى صورك أبدًا: يعمل Bildklar على هاتفك فقط، حتى دون إنترنت. مجاني حاليًا – بلا إعلانات، بلا اشتراك، بلا حساب. وأنت تقرّر.
```

### 2.3 Description (4000) — the same text in both stores

One description per language for the **App Store and Google Play** (since
19 November 2026): paste it unchanged into both. It names neither platform —
Apple rejects metadata that mentions Android (guideline 2.3.10) — and says
only what is true on both: "Handy" / "phone", "Album" (Android's galleries
show the folders as albums), "your phone's own bin … 30 days" (the phone keeps
them, not the app: Recently Deleted on the iPhone, the trash on Android, both
30 days), "if your phone offers it" for choosing
photos (iOS, Android 14+). Open eyes for the best shot are left out (iPhone
only).

**DE:**
```
Wir sehen deine Fotos nie. Bildklar räumt sie trotzdem auf – ganz auf deinem Handy, ohne Internet, ohne Konto und ohne Werbung. Doppelte und fast gleiche Fotos finden, Missglücktes aussortieren, aus Reisen Alben machen: Du entscheidest, was bleibt.

DEINE FOTOS BLEIBEN BEI DIR
• Wir können deine Fotos nicht sehen: Es gibt keinen Server, kein Konto und keinen Upload.
• Nichts verlässt dein Handy – keine Fotos, keine Orte, keine Nutzungsdaten. Keine Analyse, keine Tracker.
• Funktioniert komplett offline, auch die KI und die Ortsnamen. Probier es im Flugmodus aus.
• Wenn dein Handy es anbietet, kannst du Bildklar auch nur ausgewählte Fotos zeigen.

KOSTENLOS UND OHNE WERBUNG
• Im Moment ist in Bildklar alles kostenlos – auch das Löschen, so viel du willst.
• Keine Werbung, kein Abo, keine Probewoche, kein Konto.

DU HAST DAS LETZTE WORT
• Bildklar löscht nie von selbst. Du bestätigst jedes Löschen, und dein Handy fragt noch einmal nach.
• Gelöschte Fotos landen im Papierkorb deines Handys – nicht in Bildklar – und lassen sich dort 30 Tage lang wiederherstellen.
• Favoriten und geschützte Alben schlägt Bildklar nie vor. Deine Fotos werden nie verändert.

DEINE REISEN WERDEN ALBEN
Bildklar erkennt an Ort und Zeit deiner Fotos, wann du unterwegs warst, und gibt jeder Reise einen Namen wie „Paris, Mai 2026“. Mit einem Tipp kommen ihre Fotos in ein eigenes Album. Namen ändern, zwei Reisen zusammenlegen, eine teilen oder ausblenden – du hast das letzte Wort.

FAST GLEICHE FOTOS – DAS BESTE BLEIBT
Zwanzig Mal dasselbe Lächeln? Bildklar fasst fast gleiche Aufnahmen zu Gruppen zusammen und schlägt das beste Foto vor: das schärfste und am besten belichtete. Nebeneinander siehst du zwei Aufnahmen gleich groß, und ein Tipp zoomt beide auf dieselbe Stelle. Du behältst das Beste – oder wählst selbst.

DUPLIKATE
Dasselbe Bild noch einmal aus dem Messenger gespeichert? Bildklar findet Kopien, auch wenn Wochen dazwischen liegen, und schlägt vor, das Original zu behalten.

SUCHEN, WAS AUF DEM FOTO IST
„Hund“, „Strand“, „Geburtstag“, „Kassenzettel“: Bildklar findet Fotos nach dem, was darauf zu sehen ist – mit einer KI, die nur auf deinem Handy läuft, auch ohne Internet.

MISSGLÜCKTES, SCREENSHOTS, GROSSE DATEIEN
Verwackelt, unscharf, viel zu dunkel oder überbelichtet; alte Screenshots und Bildschirmaufnahmen; die größten Fotos und Videos zuerst – damit du weißt, wo der Speicher steckt. Kopien und ähnliche Videos findet Bildklar auch.

CHATS & SOZIALE MEDIEN
Was Messenger und soziale Medien auf deinem Handy speichern, nach App sortiert. Zum Löschen schlägt Bildklar nur Memes, Belege und Dokumente vor – das Foto von den Enkeln bleibt.

AUFRÄUMEN IN DEINEM TEMPO
Auf einen Blick siehst du, wie viel Platz jede Art belegt. Beim Durchgehen wischst du nach rechts zum Behalten und nach links zum Aussortieren; „Später“ legt ein Foto zur Seite – jeder Schritt lässt sich zurücknehmen. Oder du wählst beim schnellen Aufräumen, welche Arten weg dürfen, und bestätigst einmal.

MONAT FÜR MONAT
Geh deine Fotos Monat für Monat durch und sieh, wie viel schon geschafft ist. „An diesem Tag“ zeigt dir, was du vor Jahren fotografiert hast – auch als Widget. Auf Wunsch erinnert dich Bildklar einmal pro Woche.
```

**EN:**
```
We never see your photos. Bildklar still tidies them up – entirely on your phone, with no internet, no account and no ads. Find duplicate and near-identical photos, sort out failed shots, turn trips into albums: you decide what stays.

YOUR PHOTOS STAY WITH YOU
• We can't see your photos: there is no server, no account and no upload.
• Nothing leaves your phone – no photos, no places, no usage data. No analytics, no trackers.
• Works completely offline, the AI and the place names too. Try it in airplane mode.
• If your phone offers it, you can also let Bildklar see only the photos you choose.

FREE AND WITHOUT ADS
• For now everything in Bildklar is free – deleting too, as much as you like.
• No ads, no subscription, no trial, no account.

YOU HAVE THE LAST WORD
• Bildklar never deletes by itself. You confirm every deletion, and your phone asks once more.
• Deleted photos go to your phone's own bin – not into Bildklar – where you can recover them for 30 days.
• Favourites and protected albums are never suggested. Your photos are never changed.

YOUR TRIPS BECOME ALBUMS
From where and when your photos were taken, Bildklar works out when you were away and names each trip, like "Paris, May 2026". One tap puts its photos into an album of their own. Rename a trip, merge two, split one or hide it – you have the last word.

NEAR-IDENTICAL PHOTOS – THE BEST ONE STAYS
The same smile twenty times? Bildklar groups near-identical shots and suggests the best one: the sharpest and best exposed. Side by side shows two shots the same size, and one tap zooms both to the same spot. Keep the best – or pick your own.

DUPLICATES
Saved the same picture again from a messenger? Bildklar finds copies, even weeks apart, and suggests keeping the original.

SEARCH FOR WHAT IS IN THE PHOTO
"Dog", "beach", "birthday", "receipt": Bildklar finds photos by what they show – with an AI that runs only on your phone, even offline.

FAILED SHOTS, SCREENSHOTS, LARGE FILES
Shaky, out of focus, far too dark or washed out; old screenshots and screen recordings; the biggest photos and videos first – so you know where the space went. Copies and similar videos too.

CHATS & SOCIAL MEDIA
What messengers and social apps save on your phone, sorted by app. Bildklar only suggests deleting memes, receipts and documents – the photo of the grandchildren stays.

CLEAN UP AT YOUR OWN PACE
See at a glance how much space each kind takes up. Going through them, swipe right to keep and left to sort out; "Later" puts a photo aside – and undo any step. Or use the quick clean: choose which kinds may go and confirm once.

MONTH BY MONTH
Go through your photos a month at a time and see how much you have done. "On this day" shows what you photographed years ago – also as a widget. If you like, Bildklar reminds you once a week.
```

**AR:**
```
لا نرى صورك أبدًا. ومع ذلك يرتّبها Bildklar – على هاتفك فقط، دون إنترنت، بلا حساب وبلا إعلانات. اعثر على الصور المكرّرة وشبه المتطابقة، تخلّص من اللقطات الفاشلة، وحوّل رحلاتك إلى ألبومات: أنت تقرّر ما يبقى.

صورك تبقى معك
• لا نستطيع رؤية صورك: لا خادم ولا حساب ولا رفع للصور.
• لا شيء يغادر هاتفك – لا صور ولا أماكن ولا بيانات استخدام. بلا تحليلات وبلا تتبّع.
• يعمل دون إنترنت تمامًا، والذكاء الاصطناعي وأسماء الأماكن أيضًا. جرّبه في وضع الطيران.
• إن كان هاتفك يتيح ذلك، يمكنك أيضًا أن تُري Bildklar الصور التي تختارها فقط.

مجاني وبلا إعلانات
• كل شيء في Bildklar مجاني حاليًا – والحذف أيضًا، بقدر ما تريد.
• بلا إعلانات، بلا اشتراك، بلا فترة تجريبية، بلا حساب.

القرار الأخير لك
• لا يحذف Bildklar شيئًا من تلقاء نفسه. أنت تؤكّد كل حذف، ويسألك هاتفك مرة أخرى.
• تنتقل الصور المحذوفة إلى سلة المحذوفات في هاتفك – لا إلى Bildklar – ويمكن استعادتها منها خلال 30 يومًا.
• لا يقترح Bildklar أبدًا الصور المفضّلة أو الألبومات المحميّة، ولا يغيّر صورك أبدًا.

رحلاتك تصبح ألبومات
من مكان التقاط صورك ووقتها يعرف Bildklar متى كنت مسافرًا، ويسمّي كل رحلة مثل «Paris، مايو 2026». وبلمسة واحدة تنتقل صورها إلى ألبوم خاص بها. غيّر الاسم، ادمج رحلتين، قسّم رحلة أو أخفها – القرار لك.

صور شبه متطابقة – الأفضل يبقى
الابتسامة نفسها عشرين مرة؟ يجمع Bildklar اللقطات شبه المتطابقة في مجموعات ويقترح أفضلها: الأوضح والأفضل إضاءة. جنبًا إلى جنب ترى لقطتين بالحجم نفسه، ولمسة واحدة تكبّر الاثنتين على الموضع نفسه.

المكرّرات
الصورة نفسها محفوظة مرة أخرى من تطبيق مراسلة؟ يجد Bildklar النسخ ويقترح الاحتفاظ بالأصل.

ابحث عمّا في الصورة
«كلب»، «شاطئ»، «عيد ميلاد»، «إيصال»: يجد Bildklar الصور بحسب ما يظهر فيها – بذكاء اصطناعي يعمل على هاتفك فقط، حتى دون إنترنت.

صور فاشلة ولقطات شاشة وملفات كبيرة
الضبابية والمظلمة جدًا والساطعة جدًا، ولقطات الشاشة القديمة، وأكبر الصور والفيديوهات أولًا – لتعرف أين ذهبت المساحة.

الدردشات ووسائل التواصل
ما تحفظه تطبيقات المراسلة والتواصل على هاتفك، مرتّبًا حسب التطبيق. لا يقترح Bildklar للحذف إلا الميمز والإيصالات والمستندات – أما صورة الأحفاد فتبقى.

شهرًا بعد شهر
راجع صورك شهرًا بعد شهر: اسحب يمينًا للاحتفاظ ويسارًا للتحديد للحذف – ويمكن التراجع عن كل خطوة. و«في مثل هذا اليوم» يريك ما صوّرته في السنوات الماضية.
```

### 2.4 What's New (4000)

Not shown for the first version. From version 2 on, `npm run release` reads
`release-notes/<version>/<language>.txt` (or `release-notes/default/`).
Version 2.1.0: `release-notes/2.1.0/` (the ten features of the plan of
17 November 2026).
Version 2.2.0: `release-notes/2.2.0/` (the AI made more reliable: how sure
each suggestion is, quick clean with the sure ones only, better near-identical
groups and edited copies, search, similar photos, IDs and bank cards
protected). If these ship in an earlier version, move the lines there.
Version 2.3.0: `release-notes/2.3.0/` (the calm redesign of 18 November
2026: one next step, comparing similar shots, *Zum Löschen vorgemerkt* instead of
*Zum Löschen* with a check before deleting, the scan in the background with the
time left, all search words).
Version 2.4.0: `release-notes/2.4.0/` (the first run of 18 November 2026: the
one-screen welcome, photo access explained, the first scan's screen and its
reveal, comparing the first group side by side with one zoom, the guided
review, months that resume, the three safety nets, one-time tips and *So
funktioniert Bildklar*; and the polish of the same day: the next step first
on home, the full-bleed review with zoom and a named, undoable decision).

### 2.5 App Review information

| Field | Value |
|---|---|
| Sign-in required | **No** (leave the demo account empty) |
| Contact first / last name | Ahmad Habboubah |
| Contact email | ahmad.habboubah@gmail.com |
| Contact phone | *your phone number, with +49* |
| Attachment | Best **with** the screen recording (`npm run record:app-review`, see `ios/AppReviewRecorder/README.md`): it shows the scan, a trip and the deletion on a device with photos |

**Notes for the reviewer** (*App Review Information › Notes*, English,
paste as is; updated 19 November 2026 for the current flow — the two tabs,
*Marked for deletion*, search, Arabic, the widgets). The labels in quotes are
the app's English strings, so the reviewer can find each button; after a
renamed label or a changed flow, update this text with
`ios/AppReviewRecorder/scenes.json`:
```
Bildklar (German: "Bildklar KI: Fotos aufräumen") organizes and tidies the photo library on the device. There is no account, no sign-in, no server, no analytics and no ads. The app makes no network requests at all, so it works the same in airplane mode.

WHY PHOTO ACCESS
Photo library access is the core of the app: it reads the dates, locations and small previews of the photos to find trips, near-identical photos, duplicates and failed shots. Limited Access works too: the app then shows only the selected photos, says so on the home screen and offers "Select photos". Location data in the photos is used on the device only; place names come from a list built into the app.

BEFORE YOU START
The device needs photos. Trips need photos with a location at least 50 km from where most photos were taken, over at least six hours. A few shots of the same scene taken seconds apart show the near-identical groups and the best shot.

HOW TO TRY IT
1. First start: tap "Get started", then "Allow access to photos", and choose in the iOS dialog. The first scan shows its progress, then what it found.
2. "Clean up" tab: "Suggestions" shows how much space could be freed, by category (Duplicates, Near-identical, Failed shots, Screenshots). Open a category.
3. Near-identical photos: open a group. The green star marks the suggested best shot; tap a photo to compare it large. "Mark unstarred" puts the others into "Marked for deletion" – nothing is deleted yet.
4. "Go through": swipe right = keep, left = mark for deletion, or use the "Keep", "Mark for deletion" and "Later" buttons; "Undo" at the top right.
5. Deleting: on "Clean up", open "Marked for deletion" and tap "Review selection". A sheet shows exactly which photos go and how much space they take; its red button calls PHAssetChangeRequest.deleteAssets, and iOS asks for confirmation once more. The photos go to Recently Deleted.
6. "Organise" tab: open a trip to see its photos; the "…" menu renames, splits, merges or hides it. "Create album" makes an album in Photos (the photos are not moved or copied). The field "What is in the photo?" searches by content with an on-device model.
7. Settings (the round button at the top right): language, the weekly reminder (off by default; a local notification), "Start over".

NO IN-APP PURCHASE
Nothing is for sale in this version: every feature is free and deleting has no limit.

SAFETY
The app never deletes, moves or changes a photo on its own. Every delete needs a tap in the app and iOS's own confirmation, and goes to Recently Deleted for 30 days. Favourites are never suggested for deleting.

WIDGETS
The home-screen widget shows a photo from "On this day" or how much space could be freed; the Lock Screen widget shows numbers only, never a photo. The app writes both on the device (App Group), with no network.

The attached screen recording shows the scan, a trip, near-identical photos and a deletion on an iPhone with sample photos.

The app follows the device language: German, English or Arabic.
```

### 2.6 App Privacy (the "nutrition label")

- **Data collection:** **"No, we do not collect data from this app."** →
  **Data Not Collected.** The photos, their locations and every decision stay
  on the iPhone; a purchase (later) is handled by Apple (StoreKit), which
  doesn't count as collection by the developer.
- **Privacy policy URL:** see section 1.

### 2.7 Age rating

Answer **None / No** to every question (no violence, no mature content, no
gambling, no user-generated content shared with others, no unrestricted web
access, no chat, no advertising). Not "Made for Kids". Result: **4+**.

### 2.8 Other App Store Connect fields

| Field | Answer |
|---|---|
| Content rights ("contains third-party content?") | **Yes** — the place names come from GeoNames (CC BY 4.0, credited in *Einstellungen › Lizenzen*). Answer "Yes, and I have the rights" |
| Export compliance / encryption | `ITSAppUsesNonExemptEncryption` = `NO` is already in `Info.plist` |
| Advertising identifier (IDFA) | No |
| Availability | All countries (the texts are German and English) |
| Pricing | Free (the app). The in-app purchase at 4,99 € (step 8g of `docs/APP_STORE_RELEASE.md`) may already exist, but is **not** added to a version until the unlock goes on sale — then pick Germany as base country and let Apple set the other prices |
| Marketing URL | Optional — leave empty |
| Devices | **iPhone only** (`TARGETED_DEVICE_FAMILY = 1`) — no iPad screenshots needed |

### 2.9 App Store graphics

| Asset | Size | Note |
|---|---|---|
| App icon | 1024 × 1024 PNG, no transparency | From the Xcode asset catalogue (`assets/icon-master.png` → `npm run assets:generate`) |
| iPhone screenshots | **6.9"**: 1320 × 2868 (or 1290 × 2796), 3–10 per language | `npm run screenshots && npm run store-screenshots` → `screenshots/store/` |
| In-app purchase screenshot | any iPhone screenshot of the paywall | Only once the unlock is for sale (review only): `screenshots/<lang>/09-paywall.png` — the screenshot script takes it only then |
| App preview video | 886 × 1920, 15–30 s | Optional. `npm run app-preview` on the Mac |

**Before taking the store screenshots:** replace the drawn demo photos with
real, licensed photos (`docs/TODO.md`, step 5). Drawn photos are fine for
development, not for selling a photo app.

---

## 3. Google Play

### 3.1 Main store listing

| Field | Limit | Deutsch | English |
|---|---|---|---|
| App name | 30 | `Bildklar KI: Fotos aufräumen` | `Bildklar AI: Photo Cleaner` |
| Short description | 80 | `Doppelte Fotos finden, Reisen ordnen — offline, nichts verlässt dein Handy` | `Find duplicate photos, sort your trips — offline, nothing leaves your phone` |

The short description says what the app does, not what it costs: Google's
metadata policy counts "free", "no ads" and the like as promotional text in
the title and the short description. "No subscription, no ads" stays in the
full description. "Offline" and "nothing leaves your phone" are facts, not
promotion, so they may stand here. Play asks for an em dash (—) here; it
flagged the en dash.

Arabic (a translation in the Play Console, *Store presence › Main store listing › Manage translations*):

| Field | Limit | العربية |
|---|---|---|
| App name | 30 | `Bildklar: منظّف الصور الذكي` |
| Short description | 80 | `اعثر على الصور المكرّرة ورتّب رحلاتك — دون إنترنت، ولا شيء يغادر هاتفك` |

### 3.2 Full description (4000)

The same text as **2.3** — copy the DE, EN and AR blocks from there.

### 3.3 Store settings

| Field | Answer |
|---|---|
| App or game | App |
| Category | **Photography** |
| Tags | Photo organizer, Gallery, Storage cleaner (up to 5 from Google's list) |
| Contact email | ahmad.habboubah@gmail.com |
| Website | https://habboubah.github.io/privacy-policy/bildklar/ |
| Free or paid | **Free** ("paid" can't be undone later; the in-app product comes later and keeps the app free) |
| In-app product | *Monetize › Products › One-time products*: `com.habboubah.bildklar.unlock`, 4,99 €, name "Bildklar freischalten" / "Unlock Bildklar" — may exist already, but stays **inactive** until the unlock goes on sale |
| Countries | All, or the same as the App Store |

### 3.4 Data safety form

- **Does your app collect or share any of the required user data types?** →
  **No.** Bildklar reads the photos and their locations on the phone and
  keeps everything there; nothing it reads is sent anywhere. The app only
  asks Google Play whether the unlock is owned, and keeps that yes/no on the
  phone.
- **Encrypted in transit?** → Not applicable.
- **Way to request data deletion?** → Not applicable (no account; uninstalling
  removes everything the app stored, *Einstellungen › Daten zurücksetzen*
  removes the decisions).

**Caveat — read before answering.** Google's own guide to the form
(developer.android.com › *Declare data use*) names "uses Google Play's Billing
Library" as one example of how an app *may* touch financial data, without
saying a declaration is required. The Billing Library also logs its own API
usage to Google (`docs/ANDROID_RELEASE.md`, "The INTERNET permission"). The
answer above follows from what Bildklar does (purchase data never leaves the
phone through our code; the purchase itself happens in Google Play). If you
prefer the cautious route, declare instead: **Financial info › Purchase
history — collected, not shared, required, for App functionality, encrypted
in transit**. Either way, keep the privacy page in step with your choice.

### 3.5 App content (Policy › App content)

| Question | Answer |
|---|---|
| Privacy policy | https://habboubah.github.io/privacy-policy/bildklar/ |
| Ads | **No** |
| App access | **All functionality is available without special access** (no sign-in, nothing to buy in this version; once the unlock is on sale, add a note that licence testers can buy without paying) |
| Content rating | Questionnaire, category *"All other app types"*. **No** to violence, sexuality, language, drugs, gambling, user interaction, location sharing (locations are read but never shared). **Digital purchases: No** for now (answer the questionnaire again with *Yes* when the unlock goes on sale — then the "In-app purchases" label shows) → Everyone / PEGI 3 / USK 0 |
| Target audience | **18 and over** (parents). "Could appeal to children?" → No |
| News app / Health / Financial features / Government | No / No / None / No |
| Data safety | See 3.4 |
| **Photo and video permissions** | See below |

**Photo and video permissions declaration** (Play asks because the app holds
`READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`; core use: "photo organizer /
gallery" — answer it for both permissions). Paste:

```
Bildklar organizes the photo and video library on the device: it scans all photos and videos to find trips, duplicates, near-identical and blurry photos, screenshots, screen recordings and large videos, and moves the ones the user picks to the trash. The photo picker can't do this.
```

Play may ask for a short video of the core flow: see `docs/TODO.md`, step 5.
Also explained in the app's permission screen; with Android 14's *Select
photos* the app works with the chosen photos only.

**Testing notes for Google Play's review.** Play has no notes field while
*App access* says *All functionality is available without special access*.
Keep this text for when Play asks — with the photo and video permissions
declaration, in a reply to a rejection, or under *App access › All or some
functionality is restricted* if you ever need that (then add it there as the
instructions):

```text
Bildklar organizes the photo and video library on the device. No account, no sign-in, no server, no ads; nothing is for sale in this version, and the app works the same offline.

How to try it (the phone needs photos; trips need photos taken at least 50 km from home):
1. "Get started", then "Allow access to photos" ("Select photos" on Android 14+ works too).
2. "Clean up" tab: open a category (Duplicates, Near-identical, Failed shots, Screenshots). "Mark unstarred" or a swipe left puts photos into "Marked for deletion" – nothing is deleted yet.
3. "Marked for deletion" › "Review selection" › the red button: Android's own dialog moves the photos to the Trash (MediaStore.createTrashRequest; 30 days).
4. "Organise" tab: a trip › "Create folder" moves its photos to Pictures/Bildklar/<trip> after Android's dialog (createWriteRequest); nothing is copied.

READ_MEDIA_IMAGES and READ_MEDIA_VIDEO: the app scans the whole library to find duplicates, near-identical photos and trips; the photo picker can't do this.
```

### 3.6 Release notes (500 per language)

`npm run release:android` reads `release-notes/<version>/<language>.txt`
(the first release's notes are in `release-notes/1.0.0/`, worded for both stores; versions are on the 2.0.x line — copy them to `release-notes/<version>/` for the release they belong to).

### 3.7 Google Play graphics

| Asset | Size | Source |
|---|---|---|
| App icon | 512 × 512 PNG | `store/play-icon-512.png` |
| Feature graphic | 1024 × 500 JPG or PNG, no transparency | `screenshots/store/play-feature/<de\|en>/feature-graphic.jpg` |
| Phone screenshots | 2–8, 9:16, e.g. 1080 × 1920 | `screenshots/store/play-phone/<de\|en>/` — the Android words (Ordner, Papierkorb) come from the `--android` run of the screenshot script |

---

## 4. Before you submit

- [ ] **Names checked** in App Store Connect and the Play Console (`docs/TODO.md` step 1).
- [ ] Real, licensed demo photos in the screenshots and the preview video.
- [ ] Privacy pages published at `…/privacy-policy/bildklar/` (de + en).
- [ ] **No in-app purchase with this version** (the launch phase): on iOS
      don't add it to the version, in Play leave the product inactive. When
      the unlock goes on sale, it must be submitted **with** that version
      (App Store Connect › the version › *In-App Purchases* › +).
- [ ] App Review attachment: the recording from `npm run record:app-review`.
- [ ] Play: Photo and video permissions declaration and Data safety (3.4, 3.5).
- [ ] **Google Play closed test:** a personal developer account created after
      13 Nov 2023 needs a closed test with **at least 12 testers for 14 days in
      a row** before production. Plan about 3 weeks.
- [ ] After the app is live, fill in `APP_STORE_ID` in `src/links.ts`, so the
      "rate the app" row appears.
