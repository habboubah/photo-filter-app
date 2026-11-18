# Store listing — Bildklar KI: Foto Reiniger

Everything to copy into **App Store Connect** and the **Google Play Console**,
in German (primary), English and Arabic. Every text below fits the store's limit
(counted with `node scripts/listing-lengths.mjs` — run it again after editing).
The texts of 18 November 2026 lead with trust (no subscription, no ads,
nothing leaves the phone), then what other cleaners don't have: the side by
side comparison, search by what is in a photo, trips that become albums.
The Arabic texts are new and Claude's: please read them once before they go in.

The two stores get slightly different texts, because the app does slightly
different things: on the iPhone deleted photos go to **Zuletzt gelöscht**, on
Android to the **Papierkorb**. Open eyes count for the best photo on the
iPhone only.

**The launch phase (now).** Nothing is for sale yet (`UNLOCK_ON_SALE` is
`false` in `src/logic/allowance.ts`): deleting has no limit, and since
18 November 2026 albums / folders, smaller videos and photos and Live Photos
as stills are free in the app too. The texts below mention no purchase (and
don't yet mention the extras). The versions
that do — for the day the unlock goes on sale — are in git history (this
file before 17 November 2026): bring back those sections, the album slide
and the album scene together with the switch.

---

## 1. Shared facts (both stores)

| Field | Deutsch | English |
|---|---|---|
| App name (30) | `Bildklar KI: Foto Reiniger` | `Bildklar AI: Photo Cleaner` |
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
metadata policy — the store shows the price itself); no other app names; no
claims the app can't keep ("deletes duplicates automatically", "no internet").

---

## 2. Apple App Store

### 2.1 Name, subtitle, keywords

| Field | Limit | Deutsch (primary) | English (U.K. and U.S.) |
|---|---|---|---|
| Name | 30 | `Bildklar KI: Foto Reiniger` | `Bildklar AI: Photo Cleaner` |
| Subtitle | 30 | `Doppelte & Reisen · privat` | `Duplicates & trips · private` |

**Keywords** (100 bytes, comma-separated, no spaces after commas):

- **DE:** `unscharf,ähnlich,speicher,urlaub,handy,galerie,kinder,familie,aussortieren,bilder,privat`
- **EN:** `blurry,similar,storage,space,vacation,holiday,travel,gallery,kids,family,organizer,pictures,private`

Rules followed: no word repeated from the name or subtitle (Apple combines
them already), no "kostenlos" / "free" / "best", no other app names.

**Arabic** (an *Arabic* localization in App Store Connect; the app has spoken
Arabic since 17 November 2026 — Ahmad, please read it once as a native speaker):

| Field | Limit | العربية |
|---|---|---|
| Name | 30 | `Bildklar: منظّف الصور الذكي` |
| Subtitle | 30 | `المكرّر والرحلات · بخصوصية` |

- **AR:** `ضبابية,مشابهة,مساحة,سفر,أطفال,عائلة,ألبوم,تنظيف`

### 2.2 Promotional text (170, can be changed any time without review)

**DE:**
```
Kein Abo, keine Werbung, nichts verlässt dein iPhone. Bildklar findet fast gleiche Fotos, Duplikate und deine Reisen – und du entscheidest, was bleibt.
```

**EN:**
```
No subscription, no ads, nothing leaves your iPhone. Bildklar finds near-identical photos, duplicates and your trips – and you decide what stays.
```

**AR:**
```
بلا اشتراك، بلا إعلانات، ولا شيء يغادر iPhone. يجد Bildklar الصور شبه المتطابقة والمكرّرة ورحلاتك – وأنت تقرّر ما يبقى.
```

### 2.3 Description (4000)

**DE:**
```
Kinderfotos, Urlaubsfotos, Serienbilder: Nach ein paar Jahren sind es zehntausende. Bildklar bringt Ordnung hinein – auf deinem iPhone, ohne Konto und ohne Cloud. Kein Abo, keine Werbung: Du entscheidest, was bleibt.

DEINE REISEN, VON SELBST GEFUNDEN
Bildklar erkennt an Ort und Zeit deiner Fotos, wann du unterwegs warst, und gibt jeder Reise einen Namen wie „Paris, Mai 2026“. Namen ändern, zwei Reisen zusammenlegen, eine teilen oder ausblenden – du hast das letzte Wort. Mit einem Tipp wird aus einer Reise ein Album in Fotos.

FAST GLEICHE FOTOS
Zwanzig Mal dasselbe Lächeln? Bildklar fasst fast gleiche Aufnahmen zu Gruppen zusammen und schlägt das beste Foto vor: das schärfste, gut belichtet, mit offenen Augen. Du behältst es und löschst den Rest – oder wählst selbst.

NEBENEINANDER VERGLEICHEN
Zwei Aufnahmen gleich groß nebeneinander, ein Tipp zoomt beide auf dieselbe Stelle – so siehst du sofort, wo die Augen offen sind.

DUPLIKATE
Dasselbe Bild noch einmal aus dem Messenger gespeichert? Bildklar findet Kopien, auch wenn Wochen dazwischen liegen, und schlägt vor, das Original zu behalten.

SUCHEN, WAS AUF DEM FOTO IST
„Hund“, „Strand“, „Geburtstag“, „Kassenzettel“: Bildklar findet Fotos nach dem, was darauf zu sehen ist – mit einer KI, die nur auf deinem iPhone läuft.

MISSGLÜCKTE FOTOS
Verwackelt, unscharf, viel zu dunkel oder überbelichtet: Bildklar listet solche Fotos, die eindeutigen zuerst.

SCREENSHOTS
Alte Bildschirmfotos und -aufnahmen auf einen Blick, die über 30 Tage alten zuerst.

GROSSE DATEIEN
Die größten Fotos und Videos zuerst – damit du weißt, wo der Speicher steckt.

VIDEOS UND FOTOS IN EINEM DURCHGANG
Beim Durchgehen Monat für Monat sind auch deine Videos dabei. Kopien und ähnliche Videos schlägt Bildklar zum Löschen vor.

AUFRÄUMEN IN RUHE
Auf einen Blick siehst du, wie viel Speicher Duplikate, fast gleiche und unscharfe Fotos und alte Screenshots belegen – und wie viel Platz auf dem Gerät noch frei ist. Beim Durchgehen wischst du nach rechts zum Behalten und nach links zum Aussortieren; „Später“ legt ein Foto zur Seite – jeder Schritt lässt sich zurücknehmen. Oder du wählst beim schnellen Aufräumen, welche Arten weg dürfen, und bestätigst einmal.

GESCHÜTZTE ALBEN
Favoriten, geschützte Alben, Reisen und einzelne Fotos schlägt Bildklar nie vor.

MONAT FÜR MONAT
Geh deine ganze Mediathek Monat für Monat durch, Stück für Stück – und sieh, wie viel Prozent schon geschafft sind. Und „An diesem Tag“ zeigt dir, was du heute vor einem oder mehreren Jahren fotografiert hast. Auch als Widget auf dem Home- und dem Sperrbildschirm – und auf Wunsch erinnert dich Bildklar einmal pro Woche.

SICHER
• Bildklar löscht nie von selbst. Du bestätigst jedes Löschen, und das iPhone fragt noch einmal nach.
• Gelöschte Fotos landen in „Zuletzt gelöscht“ und lassen sich dort 30 Tage lang wiederherstellen.
• Deine Fotos werden nie verändert.

PRIVAT
• Alles passiert auf deinem iPhone: kein Konto, kein Server, keine Werbung, keine Analyse.
• Bildklar sendet weder Fotos noch Daten irgendwohin. Die Ortsnamen stammen aus einer Liste, die in der App steckt.
• Du kannst Bildklar auch nur ausgewählte Fotos zeigen.

OHNE KAUF, OHNE ABO, OHNE WERBUNG
Alles, was du in Bildklar siehst, nutzt du ohne Kauf – auch das Löschen, so viel du willst.

Gemacht von einem Vater mit viel zu vielen Kinderfotos. Auf Deutsch, Englisch und Arabisch.
```

**EN:**
```
Photos of the kids, holidays, burst shots: after a few years there are tens of thousands. Bildklar brings order to them – on your iPhone, without an account and without a cloud. No subscription, no ads: you decide what stays.

YOUR TRIPS, FOUND FOR YOU
From where and when your photos were taken, Bildklar works out when you were away and names each trip, like "Paris, May 2026". Rename a trip, merge two, split one or hide it – you have the last word. One tap turns a trip into an album in Photos.

NEAR-IDENTICAL PHOTOS
The same smile twenty times? Bildklar groups near-identical shots and suggests the best one: the sharpest, well exposed, eyes open. Keep it and delete the rest – or pick your own.

SIDE BY SIDE
Two shots the same size next to each other; one tap zooms both to the same spot – so you see at once where the eyes are open.

DUPLICATES
Saved the same picture again from a messenger? Bildklar finds copies, even weeks apart, and suggests keeping the original.

SEARCH FOR WHAT IS IN THE PHOTO
“Dog”, “beach”, “birthday”, “receipt”: Bildklar finds photos by what they show – with an AI that runs only on your iPhone.

FAILED SHOTS
Shaky, out of focus, far too dark or washed out – taken by accident in a pocket: Bildklar lists such photos, the clear cases first.

SCREENSHOTS
Old screenshots and screen recordings at a glance – the ones older than 30 days first; look at the new ones at your own pace.

LARGE FILES
The biggest photos and videos first – so you know where the space went.

VIDEOS AND PHOTOS IN ONE GO
Going through your library month by month includes your videos. Copies and similar videos – the same scene filmed twice – are suggested for deleting; you keep all the others.

CLEAN UP AT YOUR OWN PACE
See at a glance how much space duplicates, near-identical and blurry photos and old screenshots take up – and how much space is left on the device. Going through them, swipe right to keep and left to sort out; “Later” puts a photo aside – and undo any step. Or use the quick clean: choose which kinds may go and confirm once.

PROTECTED ALBUMS
What matters to you is never suggested: favourites, protected albums, trips and single photos you protect with one tap.

MONTH BY MONTH
Go through your whole library a month at a time – and see what share you have done. And "On this day" shows what you photographed on this date in earlier years. Also as a widget on the home screen and the Lock Screen – and if you like, Bildklar reminds you once a week.

SAFE
• Bildklar never deletes anything by itself. You confirm every deletion, and your iPhone asks once more.
• Deleted photos go to Recently Deleted, where you can recover them for 30 days.
• Your photos are never changed.

PRIVATE
• Everything happens on your iPhone: no account, no server, no ads, no analytics.
• Bildklar sends no photos and no data anywhere. Place names come from a list built into the app.
• You can also let Bildklar see only the photos you choose.

NO PURCHASE, NO SUBSCRIPTION, NO ADS
Everything you see in Bildklar is yours without buying anything – deleting too, as much as you like.

Made by a father with far too many photos of his kids. In German, English and Arabic.
```

**AR:**
```
صور الأطفال، صور العطلات، اللقطات المتتابعة: بعد بضع سنوات تصبح عشرات الآلاف. يرتّبها Bildklar – على iPhone، بلا حساب وبلا سحابة. بلا اشتراك وبلا إعلانات: أنت تقرّر ما يبقى.

رحلاتك، تُكتشف تلقائيًا
من مكان التقاط صورك ووقتها يعرف Bildklar متى كنت مسافرًا، ويسمّي كل رحلة مثل «Paris، مايو 2026». غيّر الاسم، ادمج رحلتين، قسّم رحلة أو أخفها – القرار لك. وبلمسة واحدة تصبح الرحلة ألبومًا في تطبيق الصور.

صور شبه متطابقة
الابتسامة نفسها عشرين مرة؟ يجمع Bildklar اللقطات شبه المتطابقة في مجموعات ويقترح أفضلها: الأوضح والأفضل إضاءة وبعيون مفتوحة. احتفظ بها وحدّد الباقي للحذف – أو اختر بنفسك.

مقارنة جنبًا إلى جنب
لقطتان بالحجم نفسه، ولمسة واحدة تكبّر الاثنتين على الموضع نفسه – فترى فورًا أين العيون مفتوحة.

المكرّرات
الصورة نفسها محفوظة مرة أخرى من تطبيق مراسلة؟ يجد Bildklar النسخ ويقترح الاحتفاظ بالأصل.

ابحث عمّا في الصورة
«كلب»، «شاطئ»، «عيد ميلاد»، «إيصال»: يجد Bildklar الصور بحسب ما يظهر فيها – بذكاء اصطناعي يعمل على iPhone فقط.

صور فاشلة ولقطات شاشة وملفات كبيرة
الضبابية والمظلمة جدًا والساطعة جدًا، ولقطات الشاشة القديمة، وأكبر الصور والفيديوهات أولًا.

شهرًا بعد شهر
راجع مكتبتك شهرًا بعد شهر: اسحب يمينًا للاحتفاظ ويسارًا للتحديد للحذف – ويمكن التراجع عن كل خطوة. و«في مثل هذا اليوم» يريك ما صوّرته في السنوات الماضية.

آمن
• لا يحذف Bildklar شيئًا من تلقاء نفسه. أنت تؤكّد كل حذف، ويسألك iPhone مرة أخرى.
• تنتقل الصور المحذوفة إلى «المحذوفة مؤخرًا» ويمكن استعادتها خلال 30 يومًا.

خاص
• كل شيء يحدث على جهازك: بلا حساب، بلا خادم، بلا إعلانات، بلا تحليلات.
• لا يرسل Bildklar أي صور أو بيانات إلى أي مكان.

صنعه أب لديه صور أطفال كثيرة جدًا. بالعربية والألمانية والإنجليزية.
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

**Notes for the reviewer** (English, paste as is):
```
Bildklar (German: "Bildklar KI: Foto Reiniger") organizes the photo library on the device. There is no account, no server and no analytics; the app sends no data anywhere.

Photo library access is the core of the app: it reads the dates, locations and small previews of the photos to find trips, near-identical photos and blurry photos. Limited Access works too (the app then shows only the selected photos and offers "Select photos"). Location data in the photos is used on the device only; place names come from a list built into the app.

How to try it (the device needs some photos; trips need photos with locations at least 50 km from where most photos were taken):
1. Allow access. The scan runs on the home screen.
2. Open the "Organise" tab and a trip: its photos; the "…" menu renames, splits, merges or hides it.
3. Near-identical photos: open a group; the suggested best photo is marked. "Delete others" asks for confirmation, then iOS asks again.
4. Blurry photos and the review (swipe right = keep, left = delete, undo button).

No in-app purchase in this version: everything the app shows is free, and deleting has no limit.

Safety: the app never deletes on its own. Deleted photos go to Recently Deleted (PHAssetChangeRequest.deleteAssets with the system confirmation). Photos are never changed or copied.

The Lock Screen widget shows numbers only, never a photo.

The attached video shows all of this on a device with sample photos.

The app is in German and English and follows the device language.
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
| App name | 30 | `Bildklar KI: Foto Reiniger` | `Bildklar AI: Photo Cleaner` |
| Short description | 80 | `Fast gleiche Fotos, Duplikate, Reisen – ohne Abo, nichts verlässt dein Handy.` | `Near-identical photos, duplicates, trips – no subscription, all on your phone.` |

Arabic (a translation in the Play Console, *Store presence › Main store listing › Manage translations*):

| Field | Limit | العربية |
|---|---|---|
| App name | 30 | `Bildklar: منظّف الصور الذكي` |
| Short description | 80 | `صور شبه متطابقة ومكرّرة ورحلات – بلا اشتراك، وكل شيء على هاتفك.` |

### 3.2 Full description (4000)

**DE:**
```
Kinderfotos, Urlaubsfotos, Serienbilder: Nach ein paar Jahren sind es zehntausende. Bildklar bringt Ordnung hinein – auf deinem Handy, ohne Konto und ohne Cloud. Kein Abo, keine Werbung: Du entscheidest, was bleibt.

DEINE REISEN, VON SELBST GEFUNDEN
Bildklar erkennt an Ort und Zeit deiner Fotos, wann du unterwegs warst, und gibt jeder Reise einen Namen wie „Paris, Mai 2026“. Namen ändern, zwei Reisen zusammenlegen, eine teilen oder ausblenden – du hast das letzte Wort. Mit einem Tipp wird aus einer Reise ein Ordner in deiner Galerie.

FAST GLEICHE FOTOS
Bildklar fasst fast gleiche Aufnahmen zu Gruppen zusammen und schlägt das beste Foto vor: das schärfste und am besten belichtete. Du behältst es und löschst den Rest – oder wählst selbst.

NEBENEINANDER VERGLEICHEN
Zwei Aufnahmen gleich groß nebeneinander, ein Tipp zoomt beide auf dieselbe Stelle – so siehst du sofort, wo die Augen offen sind.

DUPLIKATE
Dasselbe Bild noch einmal aus dem Messenger gespeichert? Bildklar findet Kopien, auch wenn Wochen dazwischen liegen, und schlägt vor, das Original zu behalten.

SUCHEN, WAS AUF DEM FOTO IST
„Hund“, „Strand“, „Geburtstag“, „Kassenzettel“: Bildklar findet Fotos nach dem, was darauf zu sehen ist – mit einer KI, die nur auf deinem Handy läuft.

MISSGLÜCKTE FOTOS
Verwackelt, unscharf, viel zu dunkel oder überbelichtet: Bildklar listet solche Fotos, die eindeutigen zuerst.

SCREENSHOTS
Alte Bildschirmfotos und -aufnahmen auf einen Blick, die über 30 Tage alten zuerst.

GROSSE DATEIEN
Die größten Fotos und Videos zuerst – damit du weißt, wo der Speicher steckt.

VIDEOS UND FOTOS IN EINEM DURCHGANG
Beim Durchgehen Monat für Monat sind auch deine Videos dabei. Kopien und ähnliche Videos schlägt Bildklar zum Löschen vor.

AUFRÄUMEN IN RUHE
Auf einen Blick siehst du, wie viel Speicher Duplikate, fast gleiche und unscharfe Fotos und alte Screenshots belegen – und wie viel Platz auf dem Gerät noch frei ist. Beim Durchgehen wischst du nach rechts zum Behalten und nach links zum Aussortieren; „Später“ legt ein Foto zur Seite – jeder Schritt lässt sich zurücknehmen. Oder du wählst beim schnellen Aufräumen, welche Arten weg dürfen, und bestätigst einmal.

GESCHÜTZTE ORDNER
Favoriten, geschützte Ordner, Reisen und einzelne Fotos schlägt Bildklar nie vor.

MONAT FÜR MONAT
Geh deine ganze Mediathek Monat für Monat durch, Stück für Stück – mit Fortschritt in Prozent. Und „An diesem Tag“ zeigt dir, was du heute vor einem oder mehreren Jahren fotografiert hast. Auch als Widget auf dem Home-Bildschirm – und auf Wunsch erinnert dich Bildklar einmal pro Woche.

AUS APPS
Fotos und Videos aus WhatsApp, Telegram und anderen Apps, nach App sortiert. Bildklar schlägt nur Memes, Belege und Dokumente zum Löschen vor.

SICHER
• Bildklar löscht nie von selbst. Du bestätigst jedes Löschen, und Android fragt noch einmal nach.
• Gelöschte Fotos landen im Papierkorb und lassen sich dort 30 Tage lang wiederherstellen.
• Deine Fotos werden nie verändert.

PRIVAT
• Alles passiert auf deinem Handy: kein Konto, kein Server, keine Werbung, keine Analyse.
• Bildklar sendet weder Fotos noch Daten irgendwohin. Die Ortsnamen stammen aus einer Liste, die in der App steckt.
• Auf Android 14 und neuer kannst du Bildklar auch nur ausgewählte Fotos zeigen.

OHNE KAUF, OHNE ABO, OHNE WERBUNG
Alles, was du in Bildklar siehst, nutzt du ohne Kauf – auch das Löschen, so viel du willst.

Gemacht von einem Vater mit viel zu vielen Kinderfotos. Auf Deutsch, Englisch und Arabisch.
```

**EN:**
```
Photos of the kids, holidays, burst shots: after a few years there are tens of thousands. Bildklar brings order to them – on your phone, without an account and without a cloud. No subscription, no ads: you decide what stays.

YOUR TRIPS, FOUND FOR YOU
From where and when your photos were taken, Bildklar works out when you were away and names each trip, like "Paris, May 2026". Rename a trip, merge two, split one or hide it – you have the last word. One tap turns a trip into a folder in your gallery.

NEAR-IDENTICAL PHOTOS
The same smile twenty times? Bildklar groups near-identical shots and suggests the best one: the sharpest and best exposed. Keep it and delete the rest – or pick your own.

SIDE BY SIDE
Two shots the same size next to each other; one tap zooms both to the same spot – so you see at once where the eyes are open.

DUPLICATES
Saved the same picture again from a messenger? Bildklar finds copies, even weeks apart, and suggests keeping the original.

SEARCH FOR WHAT IS IN THE PHOTO
“Dog”, “beach”, “birthday”, “receipt”: Bildklar finds photos by what they show – with an AI that runs only on your phone.

FAILED SHOTS
Shaky, out of focus, far too dark or washed out – taken by accident in a pocket: Bildklar lists such photos, the clear cases first.

SCREENSHOTS
Old screenshots and screen recordings at a glance – the ones older than 30 days first; look at the new ones at your own pace.

LARGE FILES
The biggest photos and videos first – so you know where the space went.

VIDEOS AND PHOTOS IN ONE GO
Going through your library month by month includes your videos. Copies and similar videos – the same scene filmed twice – are suggested for deleting; you keep all the others.

CLEAN UP AT YOUR OWN PACE
See at a glance how much space duplicates, near-identical and blurry photos and old screenshots take up – and how much space is left on the device. Going through them, swipe right to keep and left to sort out; “Later” puts a photo aside – and undo any step. Or use the quick clean: choose which kinds may go and confirm once.

PROTECTED FOLDERS
What matters to you is never suggested: favourites, protected folders, trips and single photos you protect with one tap.

MONTH BY MONTH
Go through your whole library a month at a time – and see what share you have done. And "On this day" shows what you photographed on this date in earlier years. Also as a home-screen widget – and if you like, Bildklar reminds you once a week.

FROM APPS
Photos and videos saved by WhatsApp, Telegram and other apps, by app. Bildklar only suggests deleting memes, receipts and documents.

SAFE
• Bildklar never deletes anything by itself. You confirm every deletion, and Android asks once more.
• Deleted photos go to the trash, where you can recover them for 30 days.
• Your photos are never changed.

PRIVATE
• Everything happens on your phone: no account, no server, no ads, no analytics.
• Bildklar sends no photos and no data anywhere. Place names come from a list built into the app.
• On Android 14 and newer you can also let Bildklar see only the photos you choose.

NO PURCHASE, NO SUBSCRIPTION, NO ADS
Everything you see in Bildklar is yours without buying anything – deleting too, as much as you like.

Made by a father with far too many photos of his kids. In German, English and Arabic.
```

**AR:**
```
صور الأطفال، صور العطلات، اللقطات المتتابعة: بعد بضع سنوات تصبح عشرات الآلاف. يرتّبها Bildklar – على هاتفك، بلا حساب وبلا سحابة. بلا اشتراك وبلا إعلانات: أنت تقرّر ما يبقى.

رحلاتك، تُكتشف تلقائيًا
من مكان التقاط صورك ووقتها يعرف Bildklar متى كنت مسافرًا، ويسمّي كل رحلة مثل «Paris، مايو 2026». غيّر الاسم، ادمج رحلتين، قسّم رحلة أو أخفها – القرار لك. وبلمسة واحدة تصبح الرحلة مجلدًا في معرض صورك.

صور شبه متطابقة
الابتسامة نفسها عشرين مرة؟ يجمع Bildklar اللقطات شبه المتطابقة في مجموعات ويقترح أفضلها: الأوضح والأفضل إضاءة وبعيون مفتوحة. احتفظ بها وحدّد الباقي للحذف – أو اختر بنفسك.

مقارنة جنبًا إلى جنب
لقطتان بالحجم نفسه، ولمسة واحدة تكبّر الاثنتين على الموضع نفسه – فترى فورًا أين العيون مفتوحة.

المكرّرات
الصورة نفسها محفوظة مرة أخرى من تطبيق مراسلة؟ يجد Bildklar النسخ ويقترح الاحتفاظ بالأصل.

ابحث عمّا في الصورة
«كلب»، «شاطئ»، «عيد ميلاد»، «إيصال»: يجد Bildklar الصور بحسب ما يظهر فيها – بذكاء اصطناعي يعمل على هاتفك فقط.

صور فاشلة ولقطات شاشة وملفات كبيرة
الضبابية والمظلمة جدًا والساطعة جدًا، ولقطات الشاشة القديمة، وأكبر الصور والفيديوهات أولًا.

شهرًا بعد شهر
راجع مكتبتك شهرًا بعد شهر: اسحب يمينًا للاحتفاظ ويسارًا للتحديد للحذف – ويمكن التراجع عن كل خطوة. و«في مثل هذا اليوم» يريك ما صوّرته في السنوات الماضية.

آمن
• لا يحذف Bildklar شيئًا من تلقاء نفسه. أنت تؤكّد كل حذف، ويسألك Android مرة أخرى.
• تنتقل الصور المحذوفة إلى سلة المهملات ويمكن استعادتها خلال 30 يومًا.

خاص
• كل شيء يحدث على جهازك: بلا حساب، بلا خادم، بلا إعلانات، بلا تحليلات.
• لا يرسل Bildklar أي صور أو بيانات إلى أي مكان.

صنعه أب لديه صور أطفال كثيرة جدًا. بالعربية والألمانية والإنجليزية.
```

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
