# Store listing — Bildklar KI: Foto Reiniger

Everything to copy into **App Store Connect** and the **Google Play Console**,
in German (primary), English and Arabic. Every text below fits the store's limit
(counted with `node scripts/listing-lengths.mjs` — run it again after editing).
The texts of 18 November 2026 (evening) were rewritten after a look at the
other cleaners' listings (Cleanup, Clever Cleaner, CleanMy®Phone, Swipewipe,
Slidebox, the German "AI Cleaner" apps). Their 1-star reviews are about
weekly subscriptions and trials, wrong photos marked as "similar", and
photos sent to servers. So every text opens with what Bildklar does
differently — no subscription, no ads, no account, nothing leaves the phone,
never deletes by itself, favourites never suggested — then a "Warum
Bildklar" list, then what the others don't have: trips that become
albums/folders, side by side with one zoom, search by what is in a photo,
chats sorted by app. No "speed up" or "junk" claims (the app can't keep them).
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
| Subtitle | 30 | `Doppelte Fotos & Reisealben` | `Duplicate photos & trip albums` |

The subtitle names the search people type most ("doppelte Fotos" /
"duplicate photos") and the one thing no other cleaner does: trips that
become albums. "Privat" moved into the promotional text and the first line
of the description, where there is room to say it properly.

**Keywords** (100 bytes, comma-separated, no spaces after commas):

- **DE:** `duplikate,ähnlich,unscharf,speicher,löschen,aufräumen,urlaub,galerie,kinder,familie,album,privat`
- **EN:** `similar,blurry,storage,space,delete,clean,vacation,holiday,travel,gallery,kids,family,organizer`

Rules followed: no word repeated from the name or subtitle (Apple combines
them already), no "kostenlos" / "free" / "best", no other app names.

**Arabic** (an *Arabic* localization in App Store Connect; the app has spoken
Arabic since 17 November 2026 — Ahmad, please read it once as a native speaker):

| Field | Limit | العربية |
|---|---|---|
| Name | 30 | `Bildklar: منظّف الصور الذكي` |
| Subtitle | 30 | `المكرّر وألبومات الرحلات` |

- **AR:** `ضبابية,مشابهة,مساحة,سفر,أطفال,عائلة,ألبوم,تنظيف,حذف`

### 2.2 Promotional text (170, can be changed any time without review)

**DE:**
```
Kein Abo, keine Werbung, kein Konto. Bildklar findet doppelte und fast gleiche Fotos und macht aus Reisen Alben – alles nur auf deinem iPhone. Du entscheidest.
```

**EN:**
```
No subscription, no ads, no account. Bildklar finds duplicate and near-identical photos and turns trips into albums – all on your iPhone. You decide what goes.
```

**AR:**
```
بلا اشتراك، بلا إعلانات، بلا حساب. يجد Bildklar الصور المكرّرة وشبه المتطابقة ويحوّل رحلاتك إلى ألبومات – كل ذلك على iPhone فقط. وأنت تقرّر.
```

### 2.3 Description (4000)

**DE:**
```
Bildklar räumt deine Fotos auf – ohne Abo, ohne Werbung, ohne Konto, und ohne dass ein einziges Foto dein iPhone verlässt. Doppelte und fast gleiche Fotos finden, Missglücktes aussortieren, aus Reisen Alben machen: Du entscheidest, was bleibt.

WARUM BILDKLAR
• Kein Abo, keine Probewoche, keine Werbung, kein Konto.
• Alles passiert auf deinem iPhone – auch die KI. Kein Server, keine Analyse.
• Bildklar löscht nie von selbst. Favoriten und geschützte Alben schlägt es nie vor.
• Es räumt nicht nur auf, es ordnet auch: Aus Reisen werden Alben.
• Ehrlich: Bildklar sagt dir, wann der Platz wirklich frei wird.

DEINE REISEN WERDEN ALBEN
Bildklar erkennt an Ort und Zeit deiner Fotos, wann du unterwegs warst, und gibt jeder Reise einen Namen wie „Paris, Mai 2026“. Mit einem Tipp wird daraus ein Album in Fotos. Namen ändern, zwei Reisen zusammenlegen, eine teilen oder ausblenden – du hast das letzte Wort.

FAST GLEICHE FOTOS – DAS BESTE BLEIBT
Zwanzig Mal dasselbe Lächeln? Bildklar fasst fast gleiche Aufnahmen zu Gruppen zusammen und schlägt das beste Foto vor: das schärfste, gut belichtet, mit offenen Augen. Nebeneinander siehst du zwei Aufnahmen gleich groß, und ein Tipp zoomt beide auf dieselbe Stelle. Du behältst das Beste – oder wählst selbst.

DUPLIKATE
Dasselbe Bild noch einmal aus dem Messenger gespeichert? Bildklar findet Kopien, auch wenn Wochen dazwischen liegen, und schlägt vor, das Original zu behalten.

SUCHEN, WAS AUF DEM FOTO IST
„Hund“, „Strand“, „Geburtstag“, „Kassenzettel“: Bildklar findet Fotos nach dem, was darauf zu sehen ist – mit einer KI, die nur auf deinem iPhone läuft.

MISSGLÜCKTES, SCREENSHOTS, GROSSE DATEIEN
Verwackelt, unscharf, viel zu dunkel oder überbelichtet; alte Screenshots und Bildschirmaufnahmen; die größten Fotos und Videos zuerst – damit du weißt, wo der Speicher steckt. Kopien und ähnliche Videos findet Bildklar auch.

CHATS & SOZIALE MEDIEN
Was Messenger und soziale Medien in deiner Mediathek ablegen, nach App sortiert. Zum Löschen schlägt Bildklar nur Memes, Belege und Dokumente vor – das Foto von den Enkeln bleibt.

AUFRÄUMEN IN DEINEM TEMPO
Auf einen Blick siehst du, wie viel Platz jede Art belegt. Beim Durchgehen wischst du nach rechts zum Behalten und nach links zum Aussortieren; „Später“ legt ein Foto zur Seite – jeder Schritt lässt sich zurücknehmen. Oder du wählst beim schnellen Aufräumen, welche Arten weg dürfen, und bestätigst einmal.

MONAT FÜR MONAT
Geh deine Mediathek Monat für Monat durch und sieh, wie viel schon geschafft ist. „An diesem Tag“ zeigt dir, was du vor Jahren fotografiert hast – auch als Widget. Auf Wunsch erinnert dich Bildklar einmal pro Woche.

SICHER
• Du bestätigst jedes Löschen, und das iPhone fragt noch einmal nach.
• Gelöschte Fotos landen in „Zuletzt gelöscht“ und lassen sich 30 Tage lang wiederherstellen.
• Deine Fotos werden nie verändert.

PRIVAT
• Kein Konto, kein Server, keine Werbung, keine Analyse.
• Bildklar sendet weder Fotos noch Daten irgendwohin; die Ortsnamen stammen aus einer Liste in der App.
• Du kannst Bildklar auch nur ausgewählte Fotos zeigen.

Alles, was du in Bildklar siehst, nutzt du ohne Kauf – auch das Löschen, so viel du willst.

Gemacht von einem Vater mit viel zu vielen Kinderfotos. Auf Deutsch, Englisch und Arabisch.
```

**EN:**
```
Bildklar tidies up your photos – no subscription, no ads, no account, and not a single photo ever leaves your iPhone. Find duplicate and near-identical photos, sort out failed shots, turn trips into albums: you decide what stays.

WHY BILDKLAR
• No subscription, no trial, no ads, no account.
• Everything happens on your iPhone – the AI too. No server, no analytics.
• Bildklar never deletes by itself. Favourites and protected albums are never suggested.
• It organizes as well as cleans: trips become albums.
• Honest: Bildklar tells you when the space is really freed.

YOUR TRIPS BECOME ALBUMS
From where and when your photos were taken, Bildklar works out when you were away and names each trip, like "Paris, May 2026". One tap turns it into an album in Photos. Rename a trip, merge two, split one or hide it – you have the last word.

NEAR-IDENTICAL PHOTOS – THE BEST ONE STAYS
The same smile twenty times? Bildklar groups near-identical shots and suggests the best one: the sharpest, well exposed, eyes open. Side by side shows two shots the same size, and one tap zooms both to the same spot. Keep the best – or pick your own.

DUPLICATES
Saved the same picture again from a messenger? Bildklar finds copies, even weeks apart, and suggests keeping the original.

SEARCH FOR WHAT IS IN THE PHOTO
"Dog", "beach", "birthday", "receipt": Bildklar finds photos by what they show – with an AI that runs only on your iPhone.

FAILED SHOTS, SCREENSHOTS, LARGE FILES
Shaky, out of focus, far too dark or washed out; old screenshots and screen recordings; the biggest photos and videos first – so you know where the space went. Copies and similar videos too.

CHATS & SOCIAL MEDIA
What messengers and social apps save to your library, sorted by app. Bildklar only suggests deleting memes, receipts and documents – the photo of the grandchildren stays.

CLEAN UP AT YOUR OWN PACE
See at a glance how much space each kind takes up. Going through them, swipe right to keep and left to sort out; "Later" puts a photo aside – and undo any step. Or use the quick clean: choose which kinds may go and confirm once.

MONTH BY MONTH
Go through your library a month at a time and see how much you have done. "On this day" shows what you photographed years ago – also as a widget. If you like, Bildklar reminds you once a week.

SAFE
• You confirm every deletion, and your iPhone asks once more.
• Deleted photos go to Recently Deleted, where you can recover them for 30 days.
• Your photos are never changed.

PRIVATE
• No account, no server, no ads, no analytics.
• Bildklar sends no photos and no data anywhere; place names come from a list built into the app.
• You can also let Bildklar see only the photos you choose.

Everything you see in Bildklar is yours without buying anything – deleting too, as much as you like.

Made by a father with far too many photos of his kids. In German, English and Arabic.
```

**AR:**
```
يرتّب Bildklar صورك – بلا اشتراك، بلا إعلانات، بلا حساب، ودون أن تغادر صورة واحدة جهاز iPhone. اعثر على الصور المكرّرة وشبه المتطابقة، تخلّص من اللقطات الفاشلة، وحوّل رحلاتك إلى ألبومات: أنت تقرّر ما يبقى.

لماذا Bildklar
• بلا اشتراك، بلا فترة تجريبية، بلا إعلانات، بلا حساب.
• كل شيء يحدث على iPhone – والذكاء الاصطناعي أيضًا. بلا خادم وبلا تحليلات.
• لا يحذف Bildklar شيئًا من تلقاء نفسه، ولا يقترح أبدًا الصور المفضّلة أو الألبومات المحميّة.
• لا ينظّف فقط بل يرتّب أيضًا: رحلاتك تصبح ألبومات.
• صادق: يخبرك Bildklar متى تتحرّر المساحة فعلًا.

رحلاتك تصبح ألبومات
من مكان التقاط صورك ووقتها يعرف Bildklar متى كنت مسافرًا، ويسمّي كل رحلة مثل «Paris، مايو 2026». وبلمسة واحدة تصبح ألبومًا في تطبيق الصور. غيّر الاسم، ادمج رحلتين، قسّم رحلة أو أخفها – القرار لك.

صور شبه متطابقة – الأفضل يبقى
الابتسامة نفسها عشرين مرة؟ يجمع Bildklar اللقطات شبه المتطابقة في مجموعات ويقترح أفضلها: الأوضح والأفضل إضاءة وبعيون مفتوحة. جنبًا إلى جنب ترى لقطتين بالحجم نفسه، ولمسة واحدة تكبّر الاثنتين على الموضع نفسه.

المكرّرات
الصورة نفسها محفوظة مرة أخرى من تطبيق مراسلة؟ يجد Bildklar النسخ ويقترح الاحتفاظ بالأصل.

ابحث عمّا في الصورة
«كلب»، «شاطئ»، «عيد ميلاد»، «إيصال»: يجد Bildklar الصور بحسب ما يظهر فيها – بذكاء اصطناعي يعمل على iPhone فقط.

صور فاشلة ولقطات شاشة وملفات كبيرة
الضبابية والمظلمة جدًا والساطعة جدًا، ولقطات الشاشة القديمة، وأكبر الصور والفيديوهات أولًا – لتعرف أين ذهبت المساحة.

الدردشات ووسائل التواصل
ما تحفظه تطبيقات المراسلة والتواصل في مكتبتك، مرتّبًا حسب التطبيق. لا يقترح Bildklar للحذف إلا الميمز والإيصالات والمستندات – أما صورة الأحفاد فتبقى.

شهرًا بعد شهر
راجع مكتبتك شهرًا بعد شهر: اسحب يمينًا للاحتفاظ ويسارًا للتحديد للحذف – ويمكن التراجع عن كل خطوة. و«في مثل هذا اليوم» يريك ما صوّرته في السنوات الماضية.

آمن
• أنت تؤكّد كل حذف، ويسألك iPhone مرة أخرى.
• تنتقل الصور المحذوفة إلى «المحذوفة مؤخرًا» ويمكن استعادتها خلال 30 يومًا.

خاص
• بلا حساب، بلا خادم، بلا إعلانات، بلا تحليلات.
• لا يرسل Bildklar أي صور أو بيانات إلى أي مكان.

كل ما تراه في Bildklar متاح دون شراء – والحذف أيضًا، بقدر ما تريد.

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
| Short description | 80 | `Doppelte & fast gleiche Fotos finden, Reisen als Ordner — privat auf dem Handy` | `Find duplicate & near-identical photos, trips become folders — all on device` |

The short description says what the app does, not what it costs: Google's
metadata policy counts "free", "no ads" and the like as promotional text in
the title and the short description. "No subscription, no ads" stays in the
full description. Play asks for an em dash (—) here; it flagged the en dash.

Arabic (a translation in the Play Console, *Store presence › Main store listing › Manage translations*):

| Field | Limit | العربية |
|---|---|---|
| App name | 30 | `Bildklar: منظّف الصور الذكي` |
| Short description | 80 | `اعثر على الصور المكرّرة وشبه المتطابقة، ورحلاتك تصبح مجلدات — كل شيء على هاتفك` |

### 3.2 Full description (4000)

**DE:**
```
Bildklar räumt deine Fotos auf – ohne Abo, ohne Werbung, ohne Konto, und ohne dass ein einziges Foto dein Handy verlässt. Doppelte und fast gleiche Fotos finden, Missglücktes aussortieren, aus Reisen Ordner machen: Du entscheidest, was bleibt.

WARUM BILDKLAR
• Kein Abo, keine Probewoche, keine Werbung, kein Konto.
• Alles passiert auf deinem Handy – auch die KI. Kein Server, keine Analyse.
• Bildklar löscht nie von selbst. Favoriten und geschützte Ordner schlägt es nie vor.
• Es räumt nicht nur auf, es ordnet auch: Aus Reisen werden Ordner.
• Ehrlich: Bildklar sagt dir, wann der Platz wirklich frei wird.

DEINE REISEN WERDEN ORDNER
Bildklar erkennt an Ort und Zeit deiner Fotos, wann du unterwegs warst, und gibt jeder Reise einen Namen wie „Paris, Mai 2026“. Mit einem Tipp kommen ihre Fotos in einen eigenen Ordner (Bilder/Bildklar) – Android fragt vorher nach. Namen ändern, zwei Reisen zusammenlegen, eine teilen oder ausblenden – du hast das letzte Wort.

FAST GLEICHE FOTOS – DAS BESTE BLEIBT
Zwanzig Mal dasselbe Lächeln? Bildklar fasst fast gleiche Aufnahmen zu Gruppen zusammen und schlägt das beste Foto vor: das schärfste und am besten belichtete. Nebeneinander siehst du zwei Aufnahmen gleich groß, und ein Tipp zoomt beide auf dieselbe Stelle. Du behältst das Beste – oder wählst selbst.

DUPLIKATE
Dasselbe Bild noch einmal aus dem Messenger gespeichert? Bildklar findet Kopien, auch wenn Wochen dazwischen liegen, und schlägt vor, das Original zu behalten.

SUCHEN, WAS AUF DEM FOTO IST
„Hund“, „Strand“, „Geburtstag“, „Kassenzettel“: Bildklar findet Fotos nach dem, was darauf zu sehen ist – mit einer KI, die nur auf deinem Handy läuft.

MISSGLÜCKTES, SCREENSHOTS, GROSSE DATEIEN
Verwackelt, unscharf, viel zu dunkel oder überbelichtet; alte Screenshots und Bildschirmaufnahmen; die größten Fotos und Videos zuerst – damit du weißt, wo der Speicher steckt. Kopien und ähnliche Videos findet Bildklar auch.

CHATS & SOZIALE MEDIEN
Fotos und Videos aus WhatsApp, Telegram, Instagram und anderen Apps, nach App sortiert. Zum Löschen schlägt Bildklar nur Memes, Belege und Dokumente vor – das Foto von den Enkeln bleibt.

AUFRÄUMEN IN DEINEM TEMPO
Auf einen Blick siehst du, wie viel Platz jede Art belegt. Beim Durchgehen wischst du nach rechts zum Behalten und nach links zum Aussortieren; „Später“ legt ein Foto zur Seite – jeder Schritt lässt sich zurücknehmen. Oder du wählst beim schnellen Aufräumen, welche Arten weg dürfen, und bestätigst einmal.

MONAT FÜR MONAT
Geh deine Mediathek Monat für Monat durch und sieh, wie viel schon geschafft ist. „An diesem Tag“ zeigt dir, was du vor Jahren fotografiert hast – auch als Widget auf dem Startbildschirm. Auf Wunsch erinnert dich Bildklar einmal pro Woche.

SICHER
• Du bestätigst jedes Löschen, und Android fragt noch einmal nach.
• Gelöschte Fotos landen im Papierkorb und lassen sich dort 30 Tage lang wiederherstellen.
• Deine Fotos werden nie verändert – in Ordner werden sie nur verschoben.

PRIVAT
• Kein Konto, kein Server, keine Werbung, keine Analyse.
• Bildklar sendet weder Fotos noch Daten irgendwohin; die Ortsnamen stammen aus einer Liste in der App.
• Auf Android 14 und neuer kannst du Bildklar auch nur ausgewählte Fotos zeigen.

Alles, was du in Bildklar siehst, nutzt du ohne Kauf – auch das Löschen, so viel du willst.

Gemacht von einem Vater mit viel zu vielen Kinderfotos. Auf Deutsch, Englisch und Arabisch.
```

**EN:**
```
Bildklar tidies up your photos – no subscription, no ads, no account, and not a single photo ever leaves your phone. Find duplicate and near-identical photos, sort out failed shots, turn trips into folders: you decide what stays.

WHY BILDKLAR
• No subscription, no trial, no ads, no account.
• Everything happens on your phone – the AI too. No server, no analytics.
• Bildklar never deletes by itself. Favourites and protected folders are never suggested.
• It organizes as well as cleans: trips become folders.
• Honest: Bildklar tells you when the space is really freed.

YOUR TRIPS BECOME FOLDERS
From where and when your photos were taken, Bildklar works out when you were away and names each trip, like "Paris, May 2026". One tap moves its photos into a folder of their own (Pictures/Bildklar) – Android asks first. Rename a trip, merge two, split one or hide it – you have the last word.

NEAR-IDENTICAL PHOTOS – THE BEST ONE STAYS
The same smile twenty times? Bildklar groups near-identical shots and suggests the best one: the sharpest and best exposed. Side by side shows two shots the same size, and one tap zooms both to the same spot. Keep the best – or pick your own.

DUPLICATES
Saved the same picture again from a messenger? Bildklar finds copies, even weeks apart, and suggests keeping the original.

SEARCH FOR WHAT IS IN THE PHOTO
"Dog", "beach", "birthday", "receipt": Bildklar finds photos by what they show – with an AI that runs only on your phone.

FAILED SHOTS, SCREENSHOTS, LARGE FILES
Shaky, out of focus, far too dark or washed out; old screenshots and screen recordings; the biggest photos and videos first – so you know where the space went. Copies and similar videos too.

CHATS & SOCIAL MEDIA
Photos and videos from WhatsApp, Telegram, Instagram and other apps, sorted by app. Bildklar only suggests deleting memes, receipts and documents – the photo of the grandchildren stays.

CLEAN UP AT YOUR OWN PACE
See at a glance how much space each kind takes up. Going through them, swipe right to keep and left to sort out; "Later" puts a photo aside – and undo any step. Or use the quick clean: choose which kinds may go and confirm once.

MONTH BY MONTH
Go through your library a month at a time and see how much you have done. "On this day" shows what you photographed years ago – also as a home-screen widget. If you like, Bildklar reminds you once a week.

SAFE
• You confirm every deletion, and Android asks once more.
• Deleted photos go to the trash, where you can recover them for 30 days.
• Your photos are never changed – folders only move them.

PRIVATE
• No account, no server, no ads, no analytics.
• Bildklar sends no photos and no data anywhere; place names come from a list built into the app.
• On Android 14 and newer you can also let Bildklar see only the photos you choose.

Everything you see in Bildklar is yours without buying anything – deleting too, as much as you like.

Made by a father with far too many photos of his kids. In German, English and Arabic.
```

**AR:**
```
يرتّب Bildklar صورك – بلا اشتراك، بلا إعلانات، بلا حساب، ودون أن تغادر صورة واحدة هاتفك. اعثر على الصور المكرّرة وشبه المتطابقة، تخلّص من اللقطات الفاشلة، وحوّل رحلاتك إلى مجلدات: أنت تقرّر ما يبقى.

لماذا Bildklar
• بلا اشتراك، بلا فترة تجريبية، بلا إعلانات، بلا حساب.
• كل شيء يحدث على هاتفك – والذكاء الاصطناعي أيضًا. بلا خادم وبلا تحليلات.
• لا يحذف Bildklar شيئًا من تلقاء نفسه، ولا يقترح أبدًا الصور المفضّلة أو المجلدات المحميّة.
• لا ينظّف فقط بل يرتّب أيضًا: رحلاتك تصبح مجلدات.
• صادق: يخبرك Bildklar متى تتحرّر المساحة فعلًا.

رحلاتك تصبح مجلدات
من مكان التقاط صورك ووقتها يعرف Bildklar متى كنت مسافرًا، ويسمّي كل رحلة مثل «Paris، مايو 2026». وبلمسة واحدة تنتقل صورها إلى مجلد خاص بها – بعد أن يسألك Android. غيّر الاسم، ادمج رحلتين، قسّم رحلة أو أخفها – القرار لك.

صور شبه متطابقة – الأفضل يبقى
الابتسامة نفسها عشرين مرة؟ يجمع Bildklar اللقطات شبه المتطابقة في مجموعات ويقترح أفضلها: الأوضح والأفضل إضاءة. جنبًا إلى جنب ترى لقطتين بالحجم نفسه، ولمسة واحدة تكبّر الاثنتين على الموضع نفسه.

المكرّرات
الصورة نفسها محفوظة مرة أخرى من تطبيق مراسلة؟ يجد Bildklar النسخ ويقترح الاحتفاظ بالأصل.

ابحث عمّا في الصورة
«كلب»، «شاطئ»، «عيد ميلاد»، «إيصال»: يجد Bildklar الصور بحسب ما يظهر فيها – بذكاء اصطناعي يعمل على هاتفك فقط.

صور فاشلة ولقطات شاشة وملفات كبيرة
الضبابية والمظلمة جدًا والساطعة جدًا، ولقطات الشاشة القديمة، وأكبر الصور والفيديوهات أولًا – لتعرف أين ذهبت المساحة.

الدردشات ووسائل التواصل
صور وفيديوهات WhatsApp وTelegram وInstagram وغيرها، مرتّبة حسب التطبيق. لا يقترح Bildklar للحذف إلا الميمز والإيصالات والمستندات – أما صورة الأحفاد فتبقى.

شهرًا بعد شهر
راجع مكتبتك شهرًا بعد شهر: اسحب يمينًا للاحتفاظ ويسارًا للتحديد للحذف – ويمكن التراجع عن كل خطوة. و«في مثل هذا اليوم» يريك ما صوّرته في السنوات الماضية.

آمن
• أنت تؤكّد كل حذف، ويسألك Android مرة أخرى.
• تنتقل الصور المحذوفة إلى سلة المهملات ويمكن استعادتها خلال 30 يومًا.

خاص
• بلا حساب، بلا خادم، بلا إعلانات، بلا تحليلات.
• لا يرسل Bildklar أي صور أو بيانات إلى أي مكان.

كل ما تراه في Bildklar متاح دون شراء – والحذف أيضًا، بقدر ما تريد.

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
