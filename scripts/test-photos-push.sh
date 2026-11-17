#!/usr/bin/env bash
# Puts the test library (npm run test-photos → test-photos/) on a test device.
# Never on your own phone: it adds about 200 photos and videos.
#   bash scripts/test-photos-push.sh ios       the booted iOS simulator (Xcode's simctl)
#   bash scripts/test-photos-push.sh android   the emulator or test phone adb sees
# iOS takes date and place from the files' EXIF / QuickTime metadata; Android's
# MediaStore reads them when it scans. Each file goes where a phone keeps it:
# the camera's, the screenshots' and WhatsApp's folders.
set -euo pipefail
cd "$(dirname "$0")/../test-photos" 2>/dev/null || { echo "No test-photos/ yet: run npm run test-photos first."; exit 1; }
files=$(ls | grep -v '^credits\.csv$')
case "${1:-}" in
  ios)
    xcrun simctl list devices booted | grep -q Booted || { echo "Boot a simulator first (open -a Simulator)."; exit 1; }
    # addmedia keeps the order it is given: oldest first, as a phone would have taken them.
    ls -tr | grep -v '^credits\.csv$' | tr '\n' '\0' | xargs -0 xcrun simctl addmedia booted
    echo "$(echo "$files" | wc -l | tr -d ' ') files added to the booted simulator's Photos."
    ;;
  android)
    adb get-state >/dev/null
    WA=/sdcard/Android/media/com.whatsapp/WhatsApp/Media
    adb shell mkdir -p /sdcard/DCIM/Camera /sdcard/Pictures/Screenshots "$WA/WhatsApp\ Images" "$WA/WhatsApp\ Video"
    echo "$files" | while IFS= read -r f; do  # one name has a space: "IMG_1060 (1).JPG"
      case "$f" in
        Screenshot_*) dir=/sdcard/Pictures/Screenshots ;;
        IMG-*-WA*) dir="$WA/WhatsApp Images" ;;
        VID-*-WA*) dir="$WA/WhatsApp Video" ;;
        *) dir=/sdcard/DCIM/Camera ;;
      esac
      adb push -a "$f" "$dir/" </dev/null >/dev/null
    done
    adb shell content call --uri content://media --method scan_volume --arg external_primary >/dev/null
    echo "$(echo "$files" | wc -l | tr -d ' ') files pushed and scanned."
    ;;
  *) echo "usage: $0 ios|android"; exit 1 ;;
esac
