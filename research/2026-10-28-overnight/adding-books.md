# Adding a new book by scanning its barcode

Overnight research, 28 Oct 2026. Nothing has been changed or installed; every step below waits for your yes.

## In short

- **Main way: scan with your phone, using the free app Binary Eye.** It sends the number to the library on your laptop, and the Add a book page fills itself in (title, author, cover). You pick the shelf and click Add.
- **Backup: type the 13-digit number** on the Add a book page, as you can today. Worth adding a check that catches a mistyped number.
- **The laptop webcam** needs no phone at all, but built-in webcams usually can’t focus close enough to read a book barcode. Worth a 2-minute test before anything is built for it.

## What the library can do today

- **Add a book page** (`#add`, `pageAdd` in `site/js/app.js`): type the ISBN, click Look it up (`GET /api/lookup?isbn=` in `tools/serve.py` asks Open Library), check the details, choose a shelf, click Add (`POST /api/books` saves to `data/added.json`, copies the cover, rebuilds the site). Both calls need the header `X-Library: 1`.
- **The server only answers this laptop.** `serve.py` listens on `127.0.0.1:8020`, and since today it only answers requests addressed to `localhost:8020` or `127.0.0.1:8020`. Your phone can’t reach it.
- **It already watches Downloads** every 5 minutes for a new StoryGraph export and brings it in. There’s no watcher for Libib.
- **Libib imports** (`tools/import_libib.py`) read a folder with one CSV per collection (11 files on 18 Oct) and **replace `data/books.json` whole**. They don’t check `data/added.json`, so a book added on the site and later scanned into Libib would show twice (code review item 12).
- **The typed ISBN isn’t checked**: any 13 digits are accepted, so a typo just finds nothing (or the wrong book).

## Can Chrome read barcodes by itself? (checked 28 Oct 2026)

| | Built-in barcode reader (BarcodeDetector) | Camera in a web page |
|---|---|---|
| Chrome on Windows (your laptop) | **No.** MDN: Chrome desktop “Supported on ChromeOS and macOS only”. Chrome’s own page: macOS, ChromeOS and Android. | Yes on `http://localhost:8020` (counts as secure). |
| Chrome on Android (your phone) | **Yes** (since Chrome 83; needs Google Play services). Only on secure pages: the standard marks it `SecureContext`. | Only on secure pages: on an ordinary `http://` page the camera simply isn’t offered. |

“Secure” means `https://`, or `localhost` / `127.0.0.1` on the same machine. **Your phone opening `http://192.168.x.x:8020` is not secure**, so neither the camera nor the built-in reader would work there without HTTPS.

## Barcode libraries (for the laptop webcam, since Chrome on Windows has no reader)

| Library | Licence | Latest release | Size | Looked after? | One file, no build step? |
|---|---|---|---|---|---|
| **barcode-detector** (uses zxing-wasm, i.e. ZXing-C++) | MIT (ZXing-C++ inside is Apache-2.0) | 3.2.3, 19 Oct 2026 | 43 KB script + 925 KB `.wasm` | Yes, commits this week | Yes: one script file plus the `.wasm`, both copied into `site/js/`; `prepareZXingModule` tells it to load the `.wasm` from the site instead of a CDN |
| @zxing/library + @zxing/browser | Apache-2.0 / MIT | 0.23.0 (29 Apr 2026) / 0.2.1 (6 Jul 2026) | 354 KB + 431 KB | “Maintenance mode only” (its own README) | Yes (UMD files) |
| Quagga2 | MIT | 1.13.0, 21 Oct 2026 | 154 KB | Yes (community fork) | Yes |
| html5-qrcode | Apache-2.0 | 2.3.8, Apr 2023 | 367 KB | No: “maintenance mode”, no fixes, looking for new owners | Yes |
| zbar-wasm | LGPL-2.1 | 0.11.0, May 2024 | 15 KB + 233 KB `.wasm` (or 326 KB in one) | Quiet since 2024 | Yes, but LGPL is less permissive |

**Pick: barcode-detector.** It reads EAN-13 (the book barcode, starting 978 or 979) with ZXing-C++, the strongest of these for this kind of barcode (Binary Eye on Android uses the same reader). It copies Chrome’s own `BarcodeDetector`, so the page code would work unchanged if Chrome on Windows ever gets one. Python 3.13 already serves `.wasm` files correctly (checked), so the server needs no change for it.

**The catch is the webcam, not the library.** Your laptop has Lenovo’s “Integrated Camera”. Built-in webcams are nearly always fixed focus. Microsoft says fixed focus “is not recommended” for reading barcodes, and Dynamsoft says laptop webcams “almost always lack the ability to focus”. A book barcode is small (roughly 3–4 cm wide, with very fine bars): held close it blurs, held further away it’s too few pixels.

**Quick test, nothing to install:** if your Windows Camera app has a barcode/QR mode, hold a paperback’s barcode up to it. If it reads in a few seconds, a webcam scanner on the Add page would very likely work too. If it struggles, skip the webcam.

## Ways to get the number from your phone

**(a) Phone opens the library over the Wi-Fi.** `serve.py` would have to listen on the Wi-Fi, accept your laptop’s Wi-Fi address, and ask for a secret key. For the camera it also needs HTTPS, and every way to get that has a cost:
- *Home-made certificate* (Windows can make one, no install): the phone must be told to trust it as a certificate authority. Android then warns the network “may be monitored”, and if that certificate’s key ever leaked, it could be used to fake any website to your phone. It also expires.
- *Chrome switch on the phone* (“Insecure origins treated as secure” in `chrome://flags`): works, but it’s an experimental switch that can vanish, and it turns off protection for that address.
- *Tailscale* (free Personal plan): a proper HTTPS address for your laptop (`…ts.net`) via `tailscale serve`, and it would work away from home too. Needs Tailscale on laptop and phone and an account; your device names go into public certificate logs.
- *Take a photo instead of live camera* (works on plain `http://`, read with the library above): avoids HTTPS, but the library is still opened to the Wi-Fi.

Either way the whole library, reviews included, becomes reachable from the Wi-Fi, and the site has no phone layout yet (parked). **Most work, most exposure.**

**(b) Keep scanning in Libib, and the server picks up the export.** Libib has no way for another program to fetch your books: its REST API is for paid Pro accounts ($99 a year) and only covers patrons and managers, not books. Exports are by hand: choose a collection on libib.com and a CSV downloads. The server could watch Downloads for a CSV with Libib’s columns (`id,item_type,title,creators,…`), as it does for StoryGraph, and add only books it hasn’t got; that needs a new merge step, because today’s import replaces `books.json` whole. Day to day: scan in Libib, then on the laptop open libib.com, export the collection, wait up to 5 minutes. **More clicks than typing the number**, and it breaks if Libib changes its file. Only worth it if you want Libib kept as a second record.

**(c) “Share to” the library from another app.** Chrome lets an installed web app receive things shared from other apps (Web Share Target), but installing it on the phone needs HTTPS, so it has all the problems of (a). **Not worth it.**

**(d) A scanner app.** **Binary Eye**: free, no adverts, open source (MIT), on Google Play and F-Droid; latest 1.75.6, 27 Oct 2026. Reads EAN-13 with ZXing-C++ and a phone camera that focuses close. In its settings, under **Forwarding**, “Forward scans” sends every scan to a web address (GET, form or JSON), with a **Test URL** button. It allows plain `http://` on the home network (checked in its source), shows the server’s reply as a pop-up (so it can say the book’s title), keeps a history, and has “Scan continuously” for a pile of books. It can also forward through KDE Connect (types the number on the laptop like a shop scanner; needs KDE Connect on both, which has much wider access) or just copy the number (then you type or paste it, no better than typing).

With forwarding, the server needs **one small door on the Wi-Fi that does one thing**: take a book number with the right key and put it on a “scanned” list. Pages, looking up and adding all stay this-laptop-only, so this morning’s security fix stands.

**Also possible: your phone as the laptop’s webcam** (Windows 11 “Use as connected camera”, through the Link to Windows app, Android 10 or later). It gives the webcam way a camera that focuses, but each time the phone has to be linked and allowed, and the camera chosen in Chrome. **Fiddly for one book.**

## Side by side

| Way | Each new book | How reliable | Installs / your OK needed | Opens anything to the Wi-Fi? |
|---|---|---|---|---|
| 1. Type the number (today) | Type 13 digits, Look it up, shelf, Add | Always works; typos possible (a check would catch them) | None | No |
| 2. Laptop webcam on the Add page | Scan, hold the book up, shelf, Add | Depends on the webcam’s focus: probably poor | About 1 MB library copied into the site | No |
| 3. Phone as the laptop’s webcam + 2 | Link the phone camera, then as 2 | Good camera, fiddly link | Link to Windows app; Windows setting | No (Microsoft’s own link) |
| **4. Binary Eye → laptop’s scanned list** | **Scan on the phone; the laptop page fills in; shelf, Add** | **Very reliable (phone cameras focus close)** | **Binary Eye on the phone; Windows firewall question; `serve.py` change** | **One tiny door: key needed, home networks only, can only add a number to the list** |
| 5. Binary Eye → KDE Connect | Click the ISBN box, scan on the phone | Reliable | Binary Eye + KDE Connect on both | KDE Connect’s own ports |
| 6. Phone opens the site (HTTPS) | Open the site on the phone, scan, shelf, Add | Good, once there’s a phone layout | Tailscale on both, or a certificate trusted on the phone | Whole site |
| 7. Libib + automatic pick-up | Scan in Libib, export on libib.com, wait | Depends on Libib | None (new merge code) | No |

## Recommendation

- **Main: 4, Binary Eye sending to a scanned list on the laptop.** Least effort day to day (scan, then shelf and Add on the laptop) and the most reliable: phone cameras focus close, Binary Eye uses the best reader, and it works for a pile of books too (scan them all, shelve them later). It needs no HTTPS and no phone layout, and only one small, locked door on the home network.
- **Backup: 1, typing the number**, with a check added. Works when the phone or Wi-Fi isn’t to hand, and for older books with no barcode.
- **Optional:** if the Camera app test above goes well, the webcam scanner (2) can go on the Add page as a trial behind the bottom-right switch.

## Rough build plan for the main way

**Files to change** (no `build.py` change; the scanned list is read live, not built into `data.js`):

1. `tools/serve.py`
   - A second, separate listener on port **8021**, on the Wi-Fi. It answers **only** `GET /scan?key=…&isbn=…`; anything else gets “not found”, and it never serves files.
   - The key: a long random one, made once and kept outside the site and the project (e.g. next to the app’s Chrome profile in `%LOCALAPPDATA%\Jemmas Library\`), compared safely.
   - It accepts only a real book number (13 digits, starting 978 or 979, check digit right). It looks up the title, adds it to a small list (`data/scanned.json`, with the time) and replies with the title, which Binary Eye shows on the phone (“Got it: Katabasis”).
   - On the laptop-only server: `GET /api/scanned` (the list) and a way to remove one. A book comes off the list when it’s added.
   - If port 8021 can’t start, the library still runs as now.
2. `site/js/app.js` (`pageAdd`)
   - A “From your phone” row above the form: cover, title and a “Use this” button for each scanned book.
   - While the Add page is open it checks the list every few seconds; a new scan fills the form and looks it up by itself.
   - For the backup: check the check digit when you type a number; accept spaces and dashes; say if that ISBN is already on a shelf.
3. `site/site.css`: styles for the new row.
4. `CLAUDE.md`, `TODO.md`: how it works and where things are.

**What you’d do once:**

1. Install **Binary Eye** on your phone (Play Store or F-Droid).
2. In Binary Eye: Settings → Forwarding → turn on **Forward scans**; **URL to forward to**: the address I give you (like `http://192.168.1.23:8021/scan?key=…&isbn=`); **Request type**: “GET and simply add content”; tap **Test URL**. Allow it to use the local network if the phone asks.
3. On the laptop, the first time the server listens on the Wi-Fi, Windows asks whether Python may use the network: tick **Private networks** only, not Public. Your home Wi-Fi needs to be set as a Private network in Windows (Settings → Network & internet → Wi-Fi → your network); then the door is shut automatically on café or hotel Wi-Fi.
4. Optional: in your router, give the laptop a fixed address (“DHCP reservation”). Otherwise, if the router hands it a new address, the phone link stops until I update the address in Binary Eye with you.

**Each new book after that:** open the Add a book page on the laptop, scan the book in Binary Eye, check the details that appear, pick a shelf, click Add.

**Needs your OK:**
- Installing Binary Eye on your phone.
- Letting the server listen on the home Wi-Fi at all (a step back from today’s “this laptop only” fix, limited to the one door above).
- The Windows firewall question (yours to click). Windows’ rule covers Python as a whole on private networks; no other Python program listens on the Wi-Fi today. A tighter rule for port 8021 only is possible, but it’s a Windows security setting you’d make yourself.
- Wording on the page (“From your phone”, “Use this”): your call.
- For the optional webcam trial: copying the barcode-detector library (about 1 MB, MIT and Apache-2.0) into the site.

**How it would be checked:** Binary Eye’s Test URL; a wrong key, a shop price barcode and a non-book barcode all refused; the laptop’s pages still refused from the phone; then one real book added from start to finish.

## Sources (checked 28 Oct 2026)

- MDN, BarcodeDetector (last modified 11 Jun 2026): https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- MDN browser-compat-data, BarcodeDetector (“Supported on ChromeOS and macOS only”): https://github.com/mdn/browser-compat-data/blob/main/api/BarcodeDetector.json
- caniuse, BarcodeDetector (Chrome desktop partial, Chrome for Android supported): https://caniuse.com/mdn-api_barcodedetector
- Chrome for Developers, Shape Detection API (macOS, ChromeOS, Android; Android needs Google Play services): https://developer.chrome.com/docs/capabilities/shape-detection
- Shape Detection API draft, 12 Sep 2026 (`SecureContext`): https://wicg.github.io/shape-detection-api/
- MDN, getUserMedia (camera only in secure contexts; modified 30 Nov 2025): https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN, Secure contexts (modified 14 Sep 2026): https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
- barcode-detector: https://github.com/Sec-ant/barcode-detector and https://www.npmjs.com/package/barcode-detector (3.2.3, 19 Oct 2026); zxing-wasm: https://github.com/Sec-ant/zxing-wasm (3.1.6, 19 Oct 2026); file sizes from https://www.jsdelivr.com/package/npm/barcode-detector
- @zxing/library (“Project in Maintenance Mode Only”): https://github.com/zxing-js/library; @zxing/browser: https://github.com/zxing-js/browser
- Quagga2: https://github.com/ericblade/quagga2
- html5-qrcode (“maintenance mode”, looking for new owners): https://github.com/mebjas/html5-qrcode
- zbar-wasm (LGPL-2.1): https://github.com/undecaf/zbar-wasm
- Microsoft, camera barcode scanner requirements (fixed focus “not recommended”; 27 May 2026): https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/pos/camerabarcode-system-requirements
- Dynamsoft, webcams and barcodes (laptop webcams “almost always lack the ability to focus”): https://www.dynamsoft.com/faq/barcode-reader/web/camera/webcam-support-dense.html
- Binary Eye (MIT; 1.75.6, 27 Oct 2026; forwarding settings, plain http allowed, reply shown as a pop-up): https://github.com/markusfisch/BinaryEye (settings text: `app/src/main/res/values/strings.xml`; sending: `net/ScanSender.kt`; reply pop-up: `activity/CameraActivity.kt`; `usesCleartextTraffic` in `AndroidManifest.xml`)
- KDE Connect for Windows and Android: https://kdeconnect.kde.org/download.html
- Libib pricing (REST API Pro only; free plan exports CSV): https://libib.com/pricing; Libib REST API docs (patrons and managers): https://support.libib.com/rest-api/patrons.html
- Chrome for Developers, Web Share Target (app must be installed): https://developer.chrome.com/docs/capabilities/web-apis/web-share-target
- Tailscale HTTPS certificates (public certificate logs warning; validated 10 Dec 2025): https://tailscale.com/kb/1153/enabling-https; Tailscale Serve (validated 20 Jan 2026): https://tailscale.com/kb/1312/serve; pricing (free Personal plan): https://tailscale.com/pricing
- Microsoft, use your mobile device’s camera (Windows 11, Android 10+, Link to Windows 1.24022+): https://support.microsoft.com/en-US/Windows/Apps/PhoneLink/use-your-mobile-device-s-camera
- Python, http.server (“not recommended for production”): https://docs.python.org/3/library/http.server.html
- Checked on this laptop: camera is Lenovo “Integrated Camera” (model 82Y4); Python 3.13.15 serves `.wasm` as `application/wasm`.
