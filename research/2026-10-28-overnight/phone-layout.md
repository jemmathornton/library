# Phone layout: a plan (28 Oct, nothing changed)

## What happens now
At phone width (375px) the sidebar is fixed at 280px, so it fills most of the screen and the page is squeezed into a strip
beside it (`phone-now-home.jpg`). On a book page the page is 674px wide, so the phone shows only the sidebar
(`phone-now-book.jpg`). There are no `@media` rules in `site.css` at all; the viewport tag is already right.

## What breaks, and the fix for each (one `@media (max-width: 760px)` block, plus a small menu in app.js)
| Part | Now | On a phone |
|---|---|---|
| Sidebar (`.side`) | fixed 280px column | a slim walnut top bar: “Jemma’s Library” + a Shelves button; search sits under it; the shelf list opens as a panel from the left when the button is tapped, and closes on a choice |
| Page (`main`) | `margin-left: 280px` | no margin; 16px side gutter |
| Banners (`.hero`) | big title, cover collage at 66% width | smaller title (about 44px), collage behind at low strength, less padding |
| Cover grids (`.books`) | columns of 148px or more | three across (about 104px each), smaller title text |
| Home “reading now” row (`.now-row`) | three cards side by side | one card per line |
| Book page top (`.book-top`) | 260px cover beside the title | cover (about 180px) above the title |
| Book page body (`.book-body`) | text + 330px side column | one column: blurb, then Your reading, then Details |
| List view (`.blist`) | six columns | title, author and sash only; year, pages and date hidden |
| Stats bars (`.bar-row`) | 200px label column | 110px label |
| Stats boxes (`.ledger-grid`) | four across | two across |
| To buy (`.wish`) | cards of 330px or more | one per line |
| All shelves (`.shelves`) | 250px tiles | one per line, or two small |
| New covers switch | bottom right | stays, smaller (or hidden until the trial ends) |

## Things to decide first (hers)
1. Shelves menu: a button in the top bar that opens the list (my pick), or a bar of icons along the bottom (Home, Shelves, Search, To buy, Stats).
2. On a book page, should Your reading come before the blurb on a phone (it's the bit she checks most)?
3. Is the phone for looking things up in shops (to-buy list, “do I own this?”), or for browsing too? If shops, the to-buy page and search matter most.

## Effort
About half a day: one CSS block (~60 lines), a menu button and panel in app.js (~25 lines), then checking every page at 375px and 1280px
side by side. The laptop layout doesn't change.

## Note
A phone can only open the site if it can reach the laptop (see `adding-books.md`), or once the site is online. So this goes
naturally with phone scanning or going online.
