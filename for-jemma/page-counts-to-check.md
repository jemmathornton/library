# Page counts to check

I compared the page count of every book with an ISBN (571 books) with Open Library’s record for the same ISBN, and looked for counts that are missing or can’t be right (a novel under 48 pages, anything over 1,500). **257 look wrong.** Nothing has been changed.

A book is listed when Open Library’s count is more than 40 pages and 15% away from the one in the Library, or when the count is missing or implausible. “Check by hand” means Open Library has no count, or its records disagree. Open Library can be wrong too (a hardback’s count for a paperback ISBN, say), and Libib ISBNs are sometimes another edition’s.

Books you already corrected in `data/detail-fixes.json` were left out (1 of those differs from Open Library on purpose). The to-buy list has no ISBNs or page counts, so there was nothing to check there.

**Say which to fix** (by number, e.g. “all”, “1–20 but not 7”, or “14 should be 320”).

| # | Title | Author | ISBN | Edition (Library) | Recorded | Open Library | Suggested | Why |
|---|---|---|---|---|---|---|---|---|
| 1 | The Light of All That Falls | James Islington | 9780356507859 | Little, Brown Book Group Limited, 2020 | 224 | [864](https://openlibrary.org/books/OL29516787M) | 864 | Open Library has 864 |
| 2 | Brisingr | Christopher Paolini | 9780375826726 | Alfred A. Knopf Books for Young Readers, 2008 | 224 | [748](https://openlibrary.org/books/OL10751961M) | 748 | Open Library has 748 |
| 3 | Harry Potter and the Order of the Phoenix | J. K. Rowling | 9781408855935 | Bloomsbury Childrens, 2014 | 304 | [816](https://openlibrary.org/books/OL26488085M) | 816 | Open Library has 816 |
| 4 | Out of Oz | Gregory Maguire | 9781035425945 | Headline Publishing Group, 2024 | 176 | [688](https://openlibrary.org/books/OL53263626M) | 688 | Open Library has 688 |
| 5 | Eldest (Inheritance Cycle) | Christopher Paolini | 9780375840401 | Alfred A. Knopf Books for Young Readers, 2008 | 224 | [704](https://openlibrary.org/books/OL7429515M) | 704 | Open Library has 704 |
| 6 | TheStreets of Ankh Morpork Being a Concife and Possibly Even Accurate Mapp of the Great City of the Discworld : Including Unfeen University and Environs! ... by Briggs, Stephen ( Author ) ON Nov-04-1993, Paperback | Stephen Briggs | 9780552141611 | Transworld Publishers Ltd, 1993 | 496 | [19](https://openlibrary.org/books/OL15062268M) | 19 | Open Library has 19 |
| 7 | The Host: A Novel | Stephenie Meyer | 9780316068048 | Little, Brown and Company, 2008 | 176 | [640](https://openlibrary.org/books/OL9584342M) | 640 | Open Library has 640 |
| 8 | Comic Relief: Fantastic Beasts and Where to Find Them (Harry Potter's Schoolbooks) | Newt Scamander, J. K. Rowling | 9780747554660 | Bloomsbury Publishing PLC, 2001 | 464 | [42](https://openlibrary.org/books/OL7962083M) | 42 | Open Library has 42 |
| 9 | Harry Potter and the Order of the Phoenix (Book 5) | J. K. Rowling | 9780747551003 | Bloomsbury Publishing PLC, 2003 | 352 | [772](https://openlibrary.org/books/OL25662116M) | 772 | Open Library has 772 |
| 10 | Catch-22 | Joseph Heller | 9780099477310 | Vintage, 1994 | 160 | [576](https://openlibrary.org/books/OL9273487M) | 576 | Open Library has 576 |
| 11 | The Pratchett Portfolio: A Compendium of Discworld Characters (GOLLANCZ S.F.) | Terry Pratchett | 9780575063488 | Gollancz, 1998 | 448 | [32](https://openlibrary.org/books/OL7878409M) | 32 | Open Library has 32 |
| 12 | Where's My Cow? (Discworld) | Terry Pratchett | 9780385609371 | Doubleday, 2005 | 448 | [32](https://openlibrary.org/books/OL7441524M) | 32 | Open Library has 32 |
| 13 | The Shadow of What Was Lost: Book One of the Licanius Trilogy | James Islington | 9780356507774 | Orbit, 2017 | 352 | [740](https://openlibrary.org/books/OL27941284M) | 740 | Open Library has 740 |
| 14 | Barrier Quest: Book 3 in the Quest Series: 03 (Quest (iUniverse Paperback)) | Lisa Wright Degroodt | 9780595445561 | iUniverse, 2007 | 608 | [242](https://openlibrary.org/books/OL10711655M) | 242 | Open Library has 242 |
| 15 | A/s/l | Jeanne Thornton | 9781915368768 | Dead Ink, 2025 | 144 | [498](https://openlibrary.org/books/OL57532549M) | 498 | Open Library has 498 |
| 16 | Stardust | Neil Gaiman | 9780061240485 | HarperCollins Publishers, 2007 | 688 | [336](https://openlibrary.org/books/OL9244130M) | 336 | Open Library has 336 |
| 17 | The Book of Lost Things | John Connolly | 9780340899489 | Hodder Paperbacks, 2007 | 160 | [502](https://openlibrary.org/books/OL27021934M) | 502 | Open Library has 502 |
| 18 | What Shall I Make? (What Shall I Do Today?) | Ray Gibson | 9780746020302 | Usborne Publishing Ltd, 1995 | 368 | [32](https://openlibrary.org/books/OL7957956M) | 32 | Open Library has 32 |
| 19 | Nineteen Minutes | Jodi Picoult | 9780340935798 | Hodder Paperbacks, 2008 | 274 | [608](https://openlibrary.org/books/OL34587122M) | 608 | Open Library has 608 |
| 20 | Didikai Witch: The Beyond Series - Book 1: Bk. 1 | Alison Kershaw | 9781425128081 | Trafford Publishing, 2008 | 679 | [348](https://openlibrary.org/books/OL48134285M) | 348 | Open Library has 348 |
| 21 | A Little Luck | Claudia Pineiro | 9781913867553 | Charco Press, 2023 | 448 | [120](https://openlibrary.org/books/OL39677648M) | 120 | Open Library has 120 |
| 22 | Harry Potter and the Deathly Hallows: 7/7 (Harry Potter 7) | J. K. Rowling | 9781408855959 | Bloomsbury Childrens, 2014 | 320 | [640](https://openlibrary.org/books/OL26455773M) | 640 | Open Library has 640 |
| 23 | Outward Escape | Rainbow Rowell | 9781529039900 | Pan Macmillan, 2021 | 272 | [592](https://openlibrary.org/books/OL33826883M) | 592 | Open Library has 592 |
| 24 | Son of a Witch | Gregory Maguire | 9781035425921 | Headline Publishing Group, 2024 | 192 | [512](https://openlibrary.org/books/OL53269588M) | 512 | Open Library has 512 |
| 25 | One Day | David Nicholls | 9780340896983 | Hodder & Stoughton, 2010 | 120 | [437](https://openlibrary.org/books/OL25806118M) | 437 | Open Library has 437 |
| 26 | Nick and Charlie (A Solitaire novella) | Alice Oseman | 9780008147877 | HarperCollins UK, 2015 | 432 | [120](https://openlibrary.org/books/OL39248269M) | 120 | Open Library has 120 |
| 27 | A Conjuring of Light (A Darker Shade of Magic #3) | V. E. Schwab | 9781785652448 | Titan Books, 2017 | 336 | [642](https://openlibrary.org/books/OL26851359M) | 642 | Open Library has 642 |
| 28 | Girl, Woman, Other | Bernardine Evaristo | 9780241984994 | Penguin Books, Limited, 2020 | 160 | [464](https://openlibrary.org/books/OL27930289M) | 464 | Open Library has 464 |
| 29 | Wicked: The Wicked Years Vintage Collection | Gregory Maguire | 9781035425914 | 2024 | 208 | [512](https://openlibrary.org/books/OL53273461M) | 512 | Open Library has 512 |
| 30 | This Winter (A Solitaire novella) | Alice Oseman | 9780008147884 | HarperCollins UK, 2015 | 416 | [120](https://openlibrary.org/books/OL39248990M) | 120 | Open Library has 120 |
| 31 | The Mammoth Cheese | Sheri Holman | 9781844081271 | Virago, 2004 | 176 | [468](https://openlibrary.org/books/OL19350775M) | 468 | Open Library has 468 |
| 32 | Only You Can Save Mankind | Pratchett, Terry | 9780552139267 | Corgi, 1993 | 464 | [176](https://openlibrary.org/books/OL7815002M) | 176 | Open Library has 176 |
| 33 | Harry Potter and the Goblet of Fire | J k Rowling | 9780747550990 | Bloomsbury Publishing PLC | 352 | [636](https://openlibrary.org/books/OL27323516M) | 636 | Open Library has 636 |
| 34 | Secret Seven: 9: Secret Seven Mystery (The Secret Seven Centenary Editions) | Enid Blyton | 9780340680995 | Hodder Children's Books, 1996 | 400 | [120](https://openlibrary.org/books/OL26756986M) | 120 | Open Library has 120 |
| 35 | Eragon: Book One (The Inheritance cycle) | Christopher Paolini | 9780552552097 | Corgi Childrens, 2005 | 240 | [517](https://openlibrary.org/books/OL26329400M) | 517 | Open Library has 517 |
| 36 | A Lion among Men | Gregory Maguire | 9781035425938 | Headline Publishing Group, 2024 | 176 | [448](https://openlibrary.org/books/OL53267493M) | 448 | Open Library has 448 |
| 37 | Hogfather: A Discworld Novel | Terry Pratchett | 9780552145428 | Corgi, 1997 | 176 | [445](https://openlibrary.org/books/OL25769627M) | 445 | Open Library has 445 |
| 38 | The Scarecrow | Michael Connelly | 9781409103400 | Orion, 2010 | 160 | [421](https://openlibrary.org/books/OL28235808M) | 421 | Open Library has 421 |
| 39 | The Wish List | Eoin Colfer | 9780786818631 | Hyperion Books for Children, 2003 | 512 | [252](https://openlibrary.org/books/OL8142221M) | 252 | Open Library has 252 |
| 40 | Lirael | Garth Nix | 9780007137329 | HarperCollinsChildren'sBooks, 2003 | 272 | [526](https://openlibrary.org/books/OL22042654M) | 526 | Open Library has 526 |
| 41 | The Adventure Zone: the Crystal Kingdom | Clint McElroy, Griffin McElroy, Travis McElroy, Justin McElroy | 9781250232656 | Roaring Brook Press, 2021 | 510 | [256](https://openlibrary.org/books/OL29929782M) | 256 | Open Library has 256 |
| 42 | Hamnet | Maggie O'Farrell | 9781472223791 | Headline Publishing Group, 2020 | 99 | [352](https://openlibrary.org/books/OL28057581M) | 352 | Open Library has 352 |
| 43 | The Da Vinci Code | Dan Brown | 9780552149518 | Corgi, 2004 | 352 | [605](https://openlibrary.org/books/OL31987764M) | 605 | Open Library has 605 |
| 44 | The Help | Kathryn Stockett | 9780141039282 | Penguin, 2010 | 208 | [451](https://openlibrary.org/books/OL28252045M) | 451 | Open Library has 451 |
| 45 | Famous Five 12: Five Go Down To The Sea | Enid Blyton | 9780340704226 | Hodder Children's Books, 1998 | 384 | [144](https://openlibrary.org/books/OL53229119M) | 144 | Open Library has 144 |
| 46 | Jingo | Terry Pratchett Terri Pratchett | 9780552145985 | – | 174 | [414](https://openlibrary.org/books/OL7815212M) | 414 | Open Library has 414 |
| 47 | Noughts and Crosses | Malorie Blackman | 9780552546324 | Corgi Childrens, 2002 | 448 | [208](https://openlibrary.org/books/OL7815704M) | 208 | Open Library has 208 |
| 48 | Harry Potter and the Half-blood Prince: Children's Edition (Harry Potter 6) | J. K. Rowling | 9780747581086 | Bloomsbury, 2005 | 368 | [607](https://openlibrary.org/books/OL24190024M) | 607 | Open Library has 607 |
| 49 | Secret Seven: 8: Three Cheers, Secret Seven (The Secret Seven Centenary Editions) | Enid Blyton | 9780340680988 | Hodder Children's Books, 1996 | 368 | [132](https://openlibrary.org/books/OL39201117M) | 132 | Open Library has 132 |
| 50 | Science of Discworld III: Darwin's Watch: 3 | Terry Pratchett, J. Cohen, I. Stewart | 9780091898243 | Ebury Press, 2006 | 619 | [384](https://openlibrary.org/books/OL9270079M) | 384 | Open Library has 384 |
| 51 | Secret Seven: 1: The Secret Seven (The Secret Seven Centenary Editions) | Enid Blyton | 9780340680919 | Hodder Children's Books, 1996 | 352 | [117](https://openlibrary.org/books/OL30152635M) | 117 | Open Library has 117 |
| 52 | Claudine at St.Clare's | Enid Blyton | 9780749719135 | Mammoth, 1996 | 384 | [150](https://openlibrary.org/books/OL7969191M) | 150 | Open Library has 150 |
| 53 | Unseen Academicals | Terry Pratchett | 9780385609340 | Doubleday | 632 | [400](https://openlibrary.org/books/OL23747219M) | 400 | Open Library has 400 |
| 54 | Monstrous Regiment (Discworld) | Terry Pratchett | 9780552149419 | – | 263 | [494](https://openlibrary.org/books/OL7815381M) | 494 | Open Library has 494 |
| 55 | The Paris Apartment | Lucy Foley | 9780008384982 | HarperCollins Publishers Limited, 2022 | 184 | [412](https://openlibrary.org/books/OL33823381M) | 412 | Open Library has 412 |
| 56 | Into the Fourth at Trebizon | Anne Digby | 9780246118660 | Granada Publishing, Limited, 1982 | 352 | [128](https://openlibrary.org/books/OL15554821M) | 128 | Open Library has 128 |
| 57 | Radio Silence | Alice Oseman | 9780007559251 | HarperCollins Publishers Limited, 2016 | 176 | [400](https://openlibrary.org/books/OL39249486M) | 400 | Open Library has 400 |
| 58 | The Tennis Term at Trebizon (Puffin Books) | Anne Digby | 9780583304337 | Straw Hat, 1988 | 352 | [128](https://openlibrary.org/books/OL7882480M) | 128 | Open Library has 128 |
| 59 | Lessons in Chemistry | Bonnie Garmus | 9781804990926 | Penguin Books, Limited, 2023 | 176 | [396](https://openlibrary.org/books/OL38792937M) | 396 | Open Library has 396 |
| 60 | The Martian | Andy Weir | 9780091956141 | Ebury Digital, 2014 | 151 | [369](https://openlibrary.org/books/OL26427725M) | 369 | Open Library has 369 |
| 61 | The Restaurant at the End of the Universe | Douglas Adams | 9781535200080 | 2016 | 384 | [168](https://openlibrary.org/books/OL55977103M) | 168 | Open Library has 168 |
| 62 | The Soldiers of Halla | D. J. MacHale | 9781847384218 | Simon & Schuster, Limited, 2009 | 384 | [594](https://openlibrary.org/books/OL31939776M) | 594 | Open Library has 594 |
| 63 | Around the World in 80 Trains | Monisha Rajesh | 9781408869772 | 2020 | 128 | [336](https://openlibrary.org/books/OL28056477M) | 336 | Open Library has 336 |
| 64 | Famous Five 7: Five Go Off To Camp | Enid Blyton | 9780340704066 | Hodder Children's Books, 1997 | 352 | [144](https://openlibrary.org/books/OL53229322M) | 144 | Open Library has 144 |
| 65 | Heartstopper Volume 2 | Alice Oseman | 9781444972443 | Hachette Children's Group, 2023 | 128 | [336](https://openlibrary.org/books/OL46564929M) | 336 | Open Library has 336 |
| 66 | The Fault in Our Stars | John Green | 9780141345659 | Penguin, 2013 | 144 | [352](https://openlibrary.org/books/OL25438989M) | 352 | Open Library has 352 |
| 67 | The White Horse of Zennor and other stories | Michael Morpurgo | 9780749746957 | Egmont Books Ltd, 2001 | 368 | [160](https://openlibrary.org/books/OL7969341M) | 160 | Open Library has 160 |
| 68 | Infernal Devices (Mortal Engines Quartet) | Philip Reeve | 9780439963930 | Point, 2006 | 150 | [352](https://openlibrary.org/books/OL7516482M) | 352 | Open Library has 352 |
| 69 | Secret Seven: 11: Secret Seven Fireworks (The Secret Seven Centenary Editions) | Enid Blyton | 9780340681015 | Hodder Children's Books, 1996 | 336 | [136](https://openlibrary.org/books/OL31912283M) | 136 | Open Library has 136 |
| 70 | Will Grayson, Will Grayson | John Green | 9780141346113 | Penguin, 2012 | 144 | [344](https://openlibrary.org/books/OL28238830M) | 344 | Open Library has 344 |
| 71 | The Museum of Ordinary People | Mike Gayle | 9781529344790 | Hodder & Stoughton, 2023 | 156 | [352](https://openlibrary.org/books/OL33958864M) | 352 | Open Library has 352 |
| 72 | Tiny Moons | POWLES | 9781912915347 | Emma Press, The, 2020 | 288 | [92](https://openlibrary.org/books/OL62388770M) | 92 | Open Library has 92 |
| 73 | Fifth Formers of St.Clare's | Enid Blyton | 9780749719142 | Mammoth, 1996 | 352 | [159](https://openlibrary.org/books/OL7969192M) | 159 | Open Library has 159 |
| 74 | The Discworld Mapp | Terry Pratchett, Stephen Briggs | 9780552143240 | Corgi, 1995 | 176 | [369](https://openlibrary.org/books/OL7815120M) | check by hand | Open Library has 369; Open Library’s records of this ISBN disagree (29, 369) |
| 75 | A Gathering of Shadows (A Darker Shade of Magic #2) | V. E. Schwab, Victoria Schwab | 9781783295425 | Titan Books, 2016 | 352 | [544](https://openlibrary.org/books/OL27011383M) | 544 | Open Library has 544 |
| 76 | Ruskin Park | Rory Cellan-Jones | 9781914613432 | September Publishing, 2023 | 128 | [320](https://openlibrary.org/books/OL48203826M) | 320 | Open Library has 320 |
| 77 | Skeleton Key | Anthony Horowitz | 9781844280940 | Gardners Books, 2005 | 144 | [336](https://openlibrary.org/books/OL8954346M) | 336 | Open Library has 336 |
| 78 | The House in the Cerulean Sea | T. J. Klune | 9781529087949 | Pan Macmillan, 2021 | 592 | [400](https://openlibrary.org/books/OL33936372M) | 400 | Open Library has 400 |
| 79 | Vampire Blood Trilogy | Darren Shan | 9780007143740 | HarperCollins UK, 2003 | 320 | [512](https://openlibrary.org/books/OL7262235M) | 512 | Open Library has 512 |
| 80 | Famous Five 15: Five On A Secret Trail (Famous Five Centenary Editions) | Enid Blyton | 9780340704257 | Hodder Children's Books, 1998 | 370 | [180](https://openlibrary.org/books/OL53230010M) | 180 | Open Library has 180 |
| 81 | Voice of the Gods (Age of the Five) | Trudi Canavan | 9781841495170 | Orbit, 2008 | 486 | [672](https://openlibrary.org/books/OL34587079M) | 672 | Open Library has 672 |
| 82 | Heartstopper Volume 5 | Alice Oseman | 9781444979978 | Hachette Children's Group, 2024 | 535 | [352](https://openlibrary.org/books/OL53259258M) | 352 | Open Library has 352 |
| 83 | Positively Birmingham 2015 | Jonathan Berg | 9780952317982 | Birmingham Picture Library, 2015 | 368 | [186](https://openlibrary.org/books/OL32791509M) | 186 | Open Library has 186 |
| 84 | Harry Potter and the Goblet of Fire | J. K. Rowling | 9781408845677 | Bloomsbury Publishing Plc, 2019 | 283 | [464](https://openlibrary.org/books/OL28894690M) | 464 | Open Library has 464 |
| 85 | The Loner | Josephine Cox | 9780007221134 | HarperCollins Publishers Limited, 2007 | 176 | [357](https://openlibrary.org/books/OL26588462M) | 357 | Open Library has 357 |
| 86 | Thief of Time: A Discworld Novel | Terry Pratchett | 9780552148405 | Corgi, 2002 | 608 | [430](https://openlibrary.org/books/OL7815343M) | 430 | Open Library has 430 |
| 87 | Abroad in Japan | Chris Broad | 9781804992227 | Penguin Books, Limited, 2024 | 144 | [320](https://openlibrary.org/books/OL50652896M) | 320 | Open Library has 320 |
| 88 | Beautiful World, Where Are You | Sally Rooney | 9780571365449 | Faber & Faber, Limited, 2022 | 528 | [352](https://openlibrary.org/books/OL36770725M) | 352 | Open Library has 352 |
| 89 | Blood Beast (The Demonata, Book 5) | Darren Shan | 9780007231324 | HarperCollinsChildren'sBooks, 2007 | 448 | [272](https://openlibrary.org/books/OL28233501M) | 272 | Open Library has 272 |
| 90 | Famous Five 14: Five Have Plenty Of Fun | Enid Blyton | 9780340704240 | Hodder Children's Books, 1998 | 320 | [144](https://openlibrary.org/books/OL51737545M) | 144 | Open Library has 144 |
| 91 | Plotting for Beginners: A Novel for New Beginnings | Sue Hepworth, Jane Linfoot | 9781905005123 | Snowbooks, 2006 | 176 | [352](https://openlibrary.org/books/OL8774724M) | 352 | Open Library has 352 |
| 92 | Predator's Gold (Mortal Engines Quartet) | Philip Reeve | 9780439977340 | Point, 2004 | 160 | [336](https://openlibrary.org/books/OL7516586M) | 336 | Open Library has 336 |
| 93 | A Visit From the Goon Squad | Jennifer Egan | 9781780330969 | Corsair, 2011 | 176 | [351](https://openlibrary.org/books/OL32980672M) | 351 | Open Library has 351 |
| 94 | Harry Potter and the Deathly Hallows | J.K. Rowling | 9780747591054 | Bloomsbury | 432 | [607](https://openlibrary.org/books/OL26378158M) | 607 | Open Library has 607 |
| 95 | Healer Quest: Book 10 of the Quest Series | Lisa Wright Degroodt | 9781432758349 | Outskirts Press, 2010 | 128 | [296](https://openlibrary.org/books/OL51757568M) | 296 | Open Library has 296 |
| 96 | Book Two of the Travelers: Volume 2 (Pendragon: Before the War) | Walter Sorrells, D J Machale | 9781416965237 | Aladdin Paperbacks, 2009 | 400 | [233](https://openlibrary.org/books/OL24368170M) | 233 | Open Library has 233 |
| 97 | Secret Seven: 2: Secret Seven Adventure (The Secret Seven Centenary Editions) | Enid Blyton | 9780340680926 | Hodder Children's Books, 1996 | 288 | [121](https://openlibrary.org/books/OL37063877M) | 121 | Open Library has 121 |
| 98 | Birth of a Killer | Darren Shan | 9780007315857 | HarperCollins Children's Books | 416 | [252](https://openlibrary.org/books/OL28379731M) | 252 | Open Library has 252 |
| 99 | Heartstopper Volume 1 | Alice Oseman | 9781444968934 | Hachette Children's Group, 2023 | 126 | [288](https://openlibrary.org/books/OL46574624M) | 288 | Open Library has 288 |
| 100 | For We Are Many: Volume 2 (Bobiverse) | Dennis E. Taylor | 9781680680591 | Ethan Ellenberg Literary Agency, 2017 | 150 | [311](https://openlibrary.org/books/OL26955720M) | 311 | Open Library has 311 |
| 101 | Checkmate | Malorie Blackman | 9780552551946 | Random House Children's Publishers UK, 2006 | 352 | [512](https://openlibrary.org/books/OL7815810M) | 512 | Open Library has 512 |
| 102 | Days at the Morisaki Bookshop | Satoshi Yagisawa | 9781786583239 | Manilla, 2023 | 320 | [160](https://openlibrary.org/books/OL48172424M) | 160 | Open Library has 160 |
| 103 | Every Note Played | Lisa Genova | 9781760633080 | Allen & Unwin, 2019 | 160 | [320](https://openlibrary.org/books/OL35549035M) | 320 | Open Library has 320 |
| 104 | Fourth Year Triumphs at Trebizon | Anne Digby | 9780246118684 | Granada Publishing, Limited, 1985 | 304 | [144](https://openlibrary.org/books/OL10226556M) | 144 | Open Library has 144 |
| 105 | If I Stay | Gayle Forman | 9781909531239 | Random House | 128 | [288](https://openlibrary.org/books/OL28532109M) | 288 | Open Library has 288 |
| 106 | Secret Letters at Trebizon: No 13 | Anne Digby | 9780952057109 | Straw Hat, 1993 | 288 | [128](https://openlibrary.org/books/OL11614538M) | 128 | Open Library has 128 |
| 107 | The Merchant of Death (Pendragon) | D.J. MacHale | 9780743468169 | Simon & Schuster Children's, 2003 | 384 | [224](https://openlibrary.org/books/OL7950734M) | 224 | Open Library has 224 |
| 108 | The Unforgettable Fifth at Trebizon | Anne Digby | 9780952057178 | Straw Hat, 1994 | 320 | [160](https://openlibrary.org/books/OL8476947M) | 160 | Open Library has 160 |
| 109 | Vampire Mountain (The Saga of Darren Shan, Book 4) | Darren Shan | 9780007114412 | HarperCollinsChildren'sBooks, 2009 | 336 | [176](https://openlibrary.org/books/OL26803650M) | 176 | Open Library has 176 |
| 110 | The Life and Soul of the Party | Mike Gayle | 9780340825440 | Hodder Paperbacks, 2009 | 176 | [327](https://openlibrary.org/books/OL28263723M) | 327 | Open Library has 327 |
| 111 | Firesong | William Nicholson | 9780786805716 | Hyperion Press, 2002 | 272 | [422](https://openlibrary.org/books/OL3325987M) | 422 | Open Library has 422 |
| 112 | Summer Camp at Trebizon | Anne Digby | 9780583305150 | 1982 | 277 | [128](https://openlibrary.org/books/OL7882487M) | 128 | Open Library has 128 |
| 113 | The Sea of Adventure (Adventure Series [3]) | Enid Blyton | 9780330448369 | Macmillan Children's Books, 2008 | 437 | [288](https://openlibrary.org/books/OL9343930M) | 288 | Open Library has 288 |
| 114 | Devilish | Maureen Johnson | 9781595141323 | Puffin, 2008 | 124 | [272](https://openlibrary.org/books/OL9765092M) | 272 | Open Library has 272 |
| 115 | Artificial Condition: The Murderbot Diaries | Martha Wells | 9781250186928 | St Martin's Press, 2018 | 304 | [158](https://openlibrary.org/books/OL26960367M) | 158 | Open Library has 158 |
| 116 | Demon Apocalypes | Darren Shan | 9780007231331 | HarperCollins | 384 | [239](https://openlibrary.org/books/OL31890106M) | 239 | Open Library has 239 |
| 117 | More Trouble at Trebizon | Anne Digby | 9780246114259 | Granada Publishing, Limited, 1981 | 304 | [159](https://openlibrary.org/books/OL15554810M) | 159 | Open Library has 159 |
| 118 | Cloud Atlas | David Mitchell | 9780340822784 | Hodder & Stoughton Limited | 400 | [544](https://openlibrary.org/books/OL26826296M) | 544 | Open Library has 544 |
| 119 | Enid Blyton's Sixth Form at St.Clare's | Pamela Cox, Enid Blyton | 9780749742690 | Mammoth, 2000 | 304 | [160](https://openlibrary.org/books/OL7969297M) | 160 | Open Library has 160 |
| 120 | Famous Five: 1: Five On A Treasure Island | Enid Blyton | 9780340681060 | Hodder Children's Books, 1997 | 336 | [192](https://openlibrary.org/books/OL10627256M) | 192 | Open Library has 192 |
| 121 | The Casual Vacancy | J. K. Rowling | 9781405519229 | Little, Brown Book Group Limited, 2012 | 336 | [480](https://openlibrary.org/books/OL34604819M) | 480 | Open Library has 480 |
| 122 | The Dance Tree | Kiran Millwood Hargrave | 9781529005219 | Pan Macmillan, 2022 | 400 | [256](https://openlibrary.org/books/OL36276929M) | 256 | Open Library has 256 |
| 123 | Trials of Death (The Saga of Darren Shan, Book 5) | Darren Shan | 9780007114405 | HarperCollinsChildren'sBooks, 2009 | 336 | [192](https://openlibrary.org/books/OL27302747M) | 192 | Open Library has 192 |
| 124 | Harry Potter and the Chamber of Secrets | J.K. Rowling | 9780747538486 | Bloomsbury Publishing PLC | 400 | [258](https://openlibrary.org/books/OL59041259M) | 258 | Open Library has 258 |
| 125 | Anita and Me | Meera Syal | 9780006548768 | Flamingo, 1997 | 192 | [328](https://openlibrary.org/books/OL18917866M) | 328 | Open Library has 328 |
| 126 | The Artemis Fowl: Time Paradox | Eoin Colfer | 9781423108368 | Hyperion, 2008 | 256 | [391](https://openlibrary.org/books/OL11842769M) | 391 | Open Library has 391 |
| 127 | Secret Seven: 10: Puzzle For The Secret Seven (The Secret Seven Centenary Editions) | Enid Blyton | 9780340681008 | Hodder Children's Books, 1996 | 272 | [138](https://openlibrary.org/books/OL28375120M) | 138 | Open Library has 138 |
| 128 | Exit Strategy | Martha Wells | 9781250191854 | Tom Doherty Associates, LLC, 2018 | 304 | [172](https://openlibrary.org/books/OL26976340M) | 172 | Open Library has 172 |
| 129 | Heartstopper Volume 4 | Alice Oseman | 9781444972467 | Hachette Children's Group, 2023 | 269 | [400](https://openlibrary.org/books/OL46574651M) | 400 | Open Library has 400 |
| 130 | Rogue Protocol (Murderbot Diaries) | Martha Wells | 9781250191786 | Tor.com, 2018 | 288 | [158](https://openlibrary.org/books/OL26966631M) | 158 | Open Library has 158 |
| 131 | The Zombie Survival Guide: Complete Protection from the Living Dead | Max Brooks | 9781400049622 | Broadway Books, 2003 | 384 | [254](https://openlibrary.org/books/OL3578026M) | 254 | Open Library has 254 |
| 132 | The Last Little Blue Envelope (13 Little Blue Envelopes) | Maureen Johnson | 9780061976810 | HarperCollins, 2012 | 159 | [288](https://openlibrary.org/books/OL37127939M) | 288 | Open Library has 288 |
| 133 | A Tourist Guide To Lancre: A Discworld Mapp | Stephen Briggs, Terry Pratchett | 9780552146081 | Corgi, 1998 | 160 | [32](https://openlibrary.org/books/OL7815220M) | 32 | Open Library has 32 |
| 134 | Equal Rites: A Discworld Novel | Terry Pratchett | 9780552131056 | Corgi, 1987 | 416 | [288](https://openlibrary.org/books/OL26211577M) | 288 | Open Library has 288 |
| 135 | Las Vegas - DK Eyewitness Travel Guide | Dorling Kindersley Travel Staff | 9780241275450 | Dorling Kindersley, 2017 | 288 | [160](https://openlibrary.org/books/OL28634637M) | 160 | Open Library has 160 |
| 136 | Pendragon: Raven Rise | D.J. MacHale | 9781847388643 | Simon and Schuster, 2009 | 448 | [576](https://openlibrary.org/books/OL37106964M) | 576 | Open Library has 576 |
| 137 | Secret Seven: 13: Shock For The Secret Seven (The Secret Seven Centenary Editions) | Enid Blyton | 9780340681039 | Hodder Children's Books, 1996 | 266 | [138](https://openlibrary.org/books/OL27305330M) | 138 | Open Library has 138 |
| 138 | The Truth | Terry Pratchett | 9780552147682 | Corgi | 320 | [444](https://openlibrary.org/books/OL7815307M) | 444 | Open Library has 444 |
| 139 | Famous Five 3: Five Run Away Together | Enid Blyton | 9780340704028 | Hodder & Stoughton, 1997 | 324 | [202](https://openlibrary.org/books/OL53229632M) | 202 | Open Library has 202 |
| 140 | All These Worlds: Volume 3 (Bobiverse) | Dennis E Taylor | 9781680680607 | Ethan Ellenberg Literary Agency, 2017 | 159 | [280](https://openlibrary.org/books/OL26955719M) | 280 | Open Library has 280 |
| 141 | I Shall Wear Midnight: (Discworld Novel 38) (Discworld Novels) | Terry Pratchett | 9780385611077 | Doubleday Childrens, 2010 | 280 | [400](https://openlibrary.org/books/OL24375993M) | 400 | Open Library has 400 |
| 142 | The Curious Incident of the Dog in the Night-Time: Children's Edition | Mark Haddon | 9780099456766 | Red Fox, 2004 | 160 | [279](https://openlibrary.org/books/OL26323626M) | 279 | Open Library has 279 |
| 143 | Famous Five 20: Five Have A Mystery To Solve | Enid Blyton | 9780340704301 | Hodder Children's Books, 1998 | 288 | [170](https://openlibrary.org/books/OL53230012M) | 170 | Open Library has 170 |
| 144 | The Hunger Games | Suzanne Collins | 9781407109084 | Scholastic, 2009 | 336 | [454](https://openlibrary.org/books/OL37079228M) | 454 | Open Library has 454 |
| 145 | We Are Legion (We Are Bob): Volume 1 (Bobiverse) | Dennis E. Taylor | 9781680680584 | Ethan Ellenberg Literary Agency, 2017 | 192 | [308](https://openlibrary.org/books/OL26770283M) | 308 | Open Library has 308 |
| 146 | After I Do | Taylor Jenkins Reid | 9781398516717 | Simon & Schuster, Limited, 2023 | 240 | [352](https://openlibrary.org/books/OL38016335M) | 352 | Open Library has 352 |
| 147 | Checking for Snipers | Fran Hill | 9781915643919 | 2023 | 176 | [288](https://openlibrary.org/books/OL39952048M) | 288 | Open Library has 288 |
| 148 | DK Eyewitness Japan | DK Eyewitness | 9780241615959 | Dorling Kindersley, 2023 | 240 | [352](https://openlibrary.org/books/OL46073150M) | 352 | Open Library has 352 |
| 149 | Invisible Cities | Italo Calvino, William Weaver | 9780099429838 | Chatto & Windus, 2011 | 288 | [176](https://openlibrary.org/books/OL9272436M) | 176 | Open Library has 176 |
| 150 | Looking for Alaska | John Green | 9780142402511 | Speak, 2006 | 144 | [256](https://openlibrary.org/books/OL7360666M) | 256 | Open Library has 256 |
| 151 | Priestess Of The White: Age Of The Five Book One: The Age of Five: Book One | Trudi Canavan | 9781841495156 | Orbit, 2006 | 576 | [688](https://openlibrary.org/books/OL8920148M) | 688 | Open Library has 688 |
| 152 | The Bear and The Nightingale: (Winternight Series) | Katherine Arden | 9781785031052 | Del Rey, 2017 | 352 | [464](https://openlibrary.org/books/OL28632654M) | 464 | Open Library has 464 |
| 153 | The New Discworld Companion (GOLLANCZ S.F.) | Stephen Briggs, Terry Pratchett | 9780575075559 | Gollancz, 2004 | 176 | [288](https://openlibrary.org/books/OL7878820M) | 288 | Open Library has 288 |
| 154 | The Song of Achilles | Madeline Miller | 9781408891384 | Bloomsbury Publishing Plc, 2017 | 464 | [352](https://openlibrary.org/books/OL32045117M) | 352 | Open Library has 352 |
| 155 | The Vampire Prince (The Saga of Darren Shan, Book 6) | Darren Shan | 9780007115167 | HarperCollinsChildren'sBooks, 2009 | 288 | [176](https://openlibrary.org/books/OL26846255M) | 176 | Open Library has 176 |
| 156 | Think Again | Jacqueline Wilson | 9780857506108 | Transworld Publishers Limited, 2024 | 240 | [352](https://openlibrary.org/books/OL51578580M) | 352 | Open Library has 352 |
| 157 | Around India in 80 Trains | Monisha Rajesh | 9781857885958 | Nicholas Brealey Publishing, 2012 | 144 | [248](https://openlibrary.org/books/OL26143618M) | 248 | Open Library has 248 |
| 158 | Quillan Games (Pendragon) | D. J. MacHale | 9780689875540 | Simon & Schuster Children's, 2006 | 384 | [486](https://openlibrary.org/books/OL39220541M) | 486 | Open Library has 486 |
| 159 | Oracle Quest | Lisa Wright DeGroodt | 9780595396047 | iUniverse, 2006 | 304 | [204](https://openlibrary.org/books/OL7560131M) | 204 | Open Library has 204 |
| 160 | The Diary of a Bookseller | Shaun Bythell | 9781781258637 | Profile Books Limited, 2018 | 416 | [316](https://openlibrary.org/books/OL28374002M) | 316 | Open Library has 316 |
| 161 | An Abundance of Katherines | John Green | 9780142410707 | Penguin, 2008 | 368 | [272](https://openlibrary.org/books/OL50521986M) | 272 | Open Library has 272 |
| 162 | Castaways of the Flying Dutchman | Brian Jacques | 9780141312118 | Puffin, 2002 | 432 | [336](https://openlibrary.org/books/OL32706993M) | 336 | Open Library has 336 |
| 163 | Everything Is Tuberculosis | John Green | 9798217168422 | Random House, 2025 | 160 | [256](https://openlibrary.org/books/OL57612356M) | 256 | Open Library has 256 |
| 164 | Paris | Mike Gerrard, Donna Dailey, Dorling Kindersley Publishing Staff | 9781405312417 | Dorling Kindersley, 2006 | 288 | [192](https://openlibrary.org/books/OL51019574M) | 192 | Open Library has 192 |
| 165 | The Thin Executioner | Darren Shan | 9780007315826 | HarperCollinsChildren'sBooks, 2010 | 432 | [336](https://openlibrary.org/books/OL44129605M) | 336 | Open Library has 336 |
| 166 | The Tales of Beedle the Bard, Collector's Edition (Offered Exclusively by Amazon) | J. K. Rowling | 9780956010902 | Children's High Level Group, 2008 | 257 | [352](https://openlibrary.org/books/OL28289331M) | 352 | Open Library has 352 |
| 167 | The Complete My Naughty Little Sister Storybook | Dorothy Edwards | 9780416194470 | Mammoth, 1997 | 329 | [240](https://openlibrary.org/books/OL10210158M) | 240 | Open Library has 240 |
| 168 | The Fifth Elephant: A Discworld Novel | Terry Pratchett | 9780552146166 | Corgi, 2000 | 544 | [460](https://openlibrary.org/books/OL7815225M) | 460 | Open Library has 460 |
| 169 | Eleanor & Park | Rainbow Rowell | 9781409157250 | Orion, 2014 | 256 | [336](https://openlibrary.org/books/OL29250050M) | 336 | Open Library has 336 |
| 170 | Never Lie | Freida McFadden | 9781464221361 | Sourcebooks, Incorporated, 2023 | 400 | [320](https://openlibrary.org/books/OL50648604M) | 320 | Open Library has 320 |
| 171 | The Catcher in the Rye | J. Salinger | 9780241950432 | Penguin, 2010 | 320 | [240](https://openlibrary.org/books/OL25883710M) | 240 | Open Library has 240 |
| 172 | The Light Fantastic | Terry Pratchett | 9780552128483 | Corgi | 368 | [288](https://openlibrary.org/books/OL26211575M) | check by hand | Open Library has 288; Open Library’s records of this ISBN disagree (216, 288) |
| 173 | The Murder after the Night Before | Katy Brent | 9780008536718 | HarperCollins Publishers Limited, 2024 | 256 | [336](https://openlibrary.org/books/OL50635655M) | 336 | Open Library has 336 |
| 174 | The Opal Deception (Artemis Fowl) | Eoin Colfer | 9780141381640 | Puffin Books, 2005 | 272 | [352](https://openlibrary.org/books/OL7359834M) | 352 | Open Library has 352 |
| 175 | The Twins at St.Clare's | Enid Blyton | 9780749719098 | Mammoth, 1996 | 240 | [160](https://openlibrary.org/books/OL7969187M) | 160 | Open Library has 160 |
| 176 | The Wizard's Promise (Doomspell Trilogy, Book 3) | Cliff McNish | 9781858818443 | Orion Children's Books, 2003 | 176 | [256](https://openlibrary.org/books/OL8620233M) | 256 | Open Library has 256 |
| 177 | Seven Kinds of People You Find in Bookshops | Shaun Bythell | 9781805225508 | Profile Books Limited, 2024 | 221 | [144](https://openlibrary.org/books/OL54041433M) | 144 | Open Library has 144 |
| 178 | Sons of Destiny (The Saga of Darren Shan, Book 12) | Darren Shan | 9780007159215 | HarperCollinsChildren'sBooks, 2009 | 285 | [208](https://openlibrary.org/books/OL7262752M) | 208 | Open Library has 208 |
| 179 | Secret Seven: 7: Secret Seven Win Through (The Secret Seven Centenary Editions) | Enid Blyton | 9780340680971 | Hodder Children's Books, 1996 | 198 | [122](https://openlibrary.org/books/OL35665621M) | 122 | Open Library has 122 |
| 180 | Seven Husbands of Evelyn Hugo | Taylor Jenkins Reid | 9781398515697 | Simon & Schuster, Limited, 2021 | 324 | [400](https://openlibrary.org/books/OL35578972M) | 400 | Open Library has 400 |
| 181 | The Flying Sorcerers: More Comic Tales of Fantasy | Terry Pratchett, Roald Dahl, Sir Arthur C. Clarke CBE | 9781857237252 | Orbit, 1999 | 448 | [372](https://openlibrary.org/books/OL21463124M) | 372 | Open Library has 372 |
| 182 | The Valley of Adventure (Adventure (MacMillan)) | Enid Blyton | 9780330448352 | Macmillan Children's Books, 2008 | 229 | [304](https://openlibrary.org/books/OL9397677M) | 304 | Open Library has 304 |
| 183 | Business As Usual | Jane Oliver | 9781912766185 | Handheld Press, 2020 | 192 | [266](https://openlibrary.org/books/OL28058240M) | 266 | Open Library has 266 |
| 184 | The Perks of Being a Wallflower | Stephen Chbosky | 9781471116179 | Simon & Schuster, 2012 | 160 | [231](https://openlibrary.org/books/OL51576510M) | 231 | Open Library has 231 |
| 185 | Stormbreaker | Anthony Horowitz | 9781844280926 | Candlewick Press (MA), 2005 | 170 | [240](https://openlibrary.org/books/OL8954344M) | 240 | Open Library has 240 |
| 186 | The Wind Singer (The wind on fire) | William Nicholson | 9780749744717 | Mammoth, 2001 | 272 | [340](https://openlibrary.org/books/OL15491824M) | 340 | Open Library has 340 |
| 187 | About a Boy | Nick Hornby | 9780575400955 | Indigo, 1999 | 353 | [288](https://openlibrary.org/books/OL7879001M) | 288 | Open Library has 288 |
| 188 | Autumn: Longlisted for the Man Booker Prize 2017 (Seasonal) | Ali Smith | 9780241973318 | Penguin, 2017 | 272 | [208](https://openlibrary.org/books/OL28638181M) | 208 | Open Library has 208 |
| 189 | Daisy Jones and the Six | TAYLOR. JENKINS REID | 9781787462144 | Arrow, 2020 | 352 | [416](https://openlibrary.org/books/OL28055836M) | 416 | Open Library has 416 |
| 190 | Normal People | Sally Rooney | 9780571334650 | Faber & Faber, Limited, 2019 | 368 | [304](https://openlibrary.org/books/OL27735761M) | 304 | Open Library has 304 |
| 191 | The Adventure Zone: the Eleventh Hour | Clint McElroy, Griffin McElroy | 9781250793782 | Roaring Brook Press, 2023 | 416 | [352](https://openlibrary.org/books/OL36053423M) | 352 | Open Library has 352 |
| 192 | The Colour Of Magic | Terry Pratchett | 9780552124751 | Corgi, 1985 | 352 | [288](https://openlibrary.org/books/OL26211572M) | 288 | Open Library has 288 |
| 193 | Wandering Souls | Cecile Pin | 9780008528812 | HarperCollins Publishers Limited, 2024 | 320 | [256](https://openlibrary.org/books/OL50619069M) | 256 | Open Library has 256 |
| 194 | Harry Potter and the Philosopher's Stone: Illustrated Edition (Harry Potter Illustrated ed) | J. K. Rowling | 9781408845646 | Bloomsbury Publishing PLC, 2015 | 312 | [256](https://openlibrary.org/books/OL25726816M) | 256 | Open Library has 256 |
| 195 | Waywalkers: Number 1 in series (Sam Linnifer) | Catherine Webb | 9781904233213 | Atom, 2003 | 256 | [312](https://openlibrary.org/books/OL8770786M) | 312 | Open Library has 312 |
| 196 | The Doomspell (Doomspell Trilogy, Book 1) | Cliff McNish | 9781858818504 | Orion Childrens, 2001 | 272 | [217](https://openlibrary.org/books/OL20296287M) | 217 | Open Library has 217 |
| 197 | Famous Five 19: Five Go To Demon's Rocks | Enid Blyton | 9780340704295 | Hodder Children's Books, 1998 | 240 | [186](https://openlibrary.org/books/OL53228901M) | 186 | Open Library has 186 |
| 198 | Slaves of the Mastery (Wind on Fire) | William Nicholson | 9780749749019 | Mammoth, 2002 | 288 | [339](https://openlibrary.org/books/OL7969356M) | 339 | Open Library has 339 |
| 199 | The Supernaturalist | Eoin Colfer | 9780141380407 | Puffin Books, 2004 | 240 | [291](https://openlibrary.org/books/OL28256998M) | 291 | Open Library has 291 |
| 200 | Great Railway Journeys of the World | Michael Frayn, Ludovic Kennedy, Miles Kington, Michael Palin, Eric Robson, Brian Thompson, Michael Wood | 9780563179030 | British Broadcasting Coprporation, 1981 | 144 | [192](https://openlibrary.org/books/OL3525649M) | 192 | Open Library has 192 |
| 201 | Norse Mythology | Neil Gaiman | 9780393609103 | W. W. Norton & Company, 2017 | 256 | [304](https://openlibrary.org/books/OL29744041M) | 304 | Open Library has 304 |
| 202 | The Adventure Zone: Petals to the Metal | Clint McElroy, Griffin McElroy, Travis McElroy, Justin McElroy | 9781250232632 | Roaring Brook Press, 2020 | 224 | [272](https://openlibrary.org/books/OL28183167M) | 272 | Open Library has 272 |
| 203 | The Queen of Dirt Island | Donal Ryan | 9781804991077 | Penguin Books, Limited, 2023 | 256 | [208](https://openlibrary.org/books/OL39950234M) | 208 | Open Library has 208 |
| 204 | The River of Adventure (Adventure (MacMillan)) | Enid Blyton | 9780330448383 | Macmillan Children's Books, 2009 | 208 | [160](https://openlibrary.org/books/OL9671018M) | 160 | Open Library has 160 |
| 205 | The Adventure Zone | Clint McElroy, Griffin McElroy, Justin McElroy, Travis McElroy, Carey Pietsch | 9781250153708 | Roaring Brook Press, 2018 | 192 | [238](https://openlibrary.org/books/OL26476480M) | 238 | Open Library has 238 |
| 206 | Famous Five 4: Five Go To Smuggler's Top | Enid Blyton | 9780340704035 | Hodder Children's Books, 1997 | 160 | [202](https://openlibrary.org/books/OL28249656M) | 202 | Open Library has 202 |
| 207 | Mates, Dates and Portobello Princesses (Mates, Dates) (Mates, Dates) | Cathy Hopkins | 9781853406645 | Piccadilly Press Ltd, 2001 | 202 | [160](https://openlibrary.org/books/OL3383940M) | 160 | Open Library has 160 |
| 208 | Mates, Dates and Sole Survivors (Truth Dare Kiss Or Promise) (Truth Dare Kiss Or Promise) | Cathy Hopkins | 9781853407277 | Piccadilly Press Ltd, 2002 | 202 | [160](https://openlibrary.org/books/OL8979552M) | 160 | Open Library has 160 |
| 209 | Pop Princess (Truth, Dare, Kiss or Promise) (Truth, Dare, Kiss or Promise) | Cathy Hopkins | 9781853407321 | Piccadilly Press Ltd, 2002 | 201 | [160](https://openlibrary.org/books/OL8979553M) | 160 | Open Library has 160 |
| 210 | A Degree of Love | Jane Andrews | 9781718178441 | – | – | [511](https://openlibrary.org/books/OL40768842M) | 511 | no page count recorded |
| 211 | Age of Shadows (Song of Echoes) | R.E. Palmer | 9781838399528 | FrontRunner Publications, 2022 | – | [none](https://openlibrary.org/isbn/9781838399528) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 212 | Becoming | Michelle Obama | 9780241983003 | – | – | [none](https://openlibrary.org/isbn/9780241983003) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 213 | Brambly Hedge Spring Story | Jill. Barklem | 9780583333245 | Ted Smart, 1995 | – | [none](https://openlibrary.org/isbn/9780583333245) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 214 | Brambly Hedge Winter Story | Jill Barklem | 9780583333238 | Ted Smart, 1995 | – | [none](https://openlibrary.org/isbn/9780583333238) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 215 | Bringing Down the Flowers: ONE (A Spellbinding Dystopian Mystery (the Hedge Witch Series Book 1)) | Denise Critchley | 9781068300929 | Copper Ink Ltd, 2025 | – | [none](https://openlibrary.org/isbn/9781068300929) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 216 | Crown of Sorrows (Legacy of the Stones) | R.E. Palmer | 9781838399542 | FrontRunner Publications, 2024 | – | [none](https://openlibrary.org/isbn/9781838399542) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 217 | Dear Mr. Potter (Leters of Love, Loss,e Magic | – | 9780615479316 | n/a, 2011 | – | [none](https://openlibrary.org/isbn/9780615479316) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 218 | Fantastic Beasts and Where to Find Them: Illustrated Edition | J. K. Rowling | 9781408885260 | Bloomsbury Childrens, 2017 | 800 | [none](https://openlibrary.org/books/OL28298936M) | check by hand | far from Open Library’s other editions of the book (about 114); Open Library has no page count for this ISBN |
| 219 | First Term At Malory Towers | Enid Blyton | 9781444948295 | Hodder Children's Books | – | [none](https://openlibrary.org/books/OL43531632M) | check by hand | no page count recorded; Open Library has no page count for this ISBN (other editions of the book: about 160) |
| 220 | Fund and Games At Malory Towers | enid blyton | 9781444948387 | Hodder Children's Books, 2018 | – | [none](https://openlibrary.org/books/OL43044902M) | check by hand | no page count recorded; Open Library has no page count for this ISBN |
| 221 | Harry Potter and the Prisoner of Azkaban: 3/7 (Harry Potter 3) | J. K. Rowling | 9781408855911 | Bloomsbury Childrens, 2014 | 192 | [none](https://openlibrary.org/books/OL26421949M) | check by hand | far from Open Library’s other editions of the book (about 416); Open Library has no page count for this ISBN |
| 222 | Heaven's River | Dennis E. Taylor | 9781680682267 | 2021 | 160 | [none](https://openlibrary.org/books/OL31846674M) | check by hand | far from Open Library’s other editions of the book (about 676); Open Library has no page count for this ISBN |
| 223 | House of Open Wounds | Adrian Tchaikovsky | 9781035901364 | Ad Astra, 2024 | – | [610](https://openlibrary.org/books/OL51048774M) | 610 | no page count recorded |
| 224 | How to Age Disgracefully | Clare Pooley | 9781787637146 | Bantam Press, 2024 | – | [364](https://openlibrary.org/books/OL50656921M) | 364 | no page count recorded |
| 225 | In Memoriam | Alice Winn | 9780241567838 | Penguin Group, 2023 | – | [368](https://openlibrary.org/books/OL46574004M) | 368 | no page count recorded |
| 226 | Kitty at St. Clare's | Enid Blyton | 9781405270250 | EGMONT | – | [none](https://openlibrary.org/books/OL43022646M) | check by hand | no page count recorded; Open Library has no page count for this ISBN |
| 227 | Last Term At Malory Towers | Enid Blyton | 9781444948349 | Hodder Children's Books | 400 | [none](https://openlibrary.org/books/OL43078636M) | check by hand | far from Open Library’s other editions of the book (about 160); Open Library has no page count for this ISBN |
| 228 | Leading Gracefully: A Women's Guide to Confident, Authentic & Effective Leadership | Monique Svazlian Tallon | 9780996984409 | Highest Path Publishing, 2016 | – | [none](https://openlibrary.org/isbn/9780996984409) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 229 | Miss Spider's Tea Party | – | 9780590477246 | Virgin Books, 1999 | 412 | [none](https://openlibrary.org/books/OL1407315M) | check by hand | far from Open Library’s other editions of the book (about 31); Open Library says 1 (not a real count) |
| 230 | Notes from a Small Island | Bill Bryson | 9780552996006 | Black Swan | 128 | [none](https://openlibrary.org/books/OL37821712M) | 352 | far from Open Library’s other editions of the book (about 324); another Open Library record of this ISBN has 352 |
| 231 | Pretties | Scott Westerfeld | 9781471123955 | Simon & Schuster, 2014 | – | [none](https://openlibrary.org/books/OL35341191M) | check by hand | no page count recorded; Open Library has no page count for this ISBN (other editions of the book: about 377) |
| 232 | Realm of Mortals (Legacy of the Stones) | R.E. Palmer | 9781838399559 | FrontRunner Publications, 2025 | – | [none](https://openlibrary.org/isbn/9781838399559) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 233 | Sea of Souls (Legacy of the Stones) | R.E Palmer | 9781838399535 | FrontRunner Publications, 2023 | – | [none](https://openlibrary.org/isbn/9781838399535) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 234 | Second Term at Trebizon | Anne Digby | 9780246114204 | HarperCollins Distribution Services, 1980 | 382 | [none](https://openlibrary.org/books/OL14973373M) | check by hand | far from Open Library’s other editions of the book (about 124); Open Library says 8 (not a real count) |
| 235 | Secret Seven 4: Secret Seven on the Trail (Secret Seven Centenary Editions) | Enid Blyton | 9780340680940 | Hodder Children's Books, 1996 | 480 | [none](https://openlibrary.org/books/OL51301613M) | 137 | far from Open Library’s other editions of the book (about 138); another Open Library record of this ISBN has 137 |
| 236 | Sisterhood 4: Forever in Blue: The Fourth Summer of the Sisterhood | Ann Brashares | 9780375843181 | Delacorte Press, 2007 | 32 | [none](https://openlibrary.org/books/OL24281452M) | check by hand | far from Open Library’s other editions of the book (about 400); Open Library has no page count for this ISBN |
| 237 | Something From Tiffanys | Melissa Hill | 9780340993361 | – | 176 | [none](https://openlibrary.org/books/OL26154113M) | check by hand | far from Open Library’s other editions of the book (about 416); Open Library has no page count for this ISBN |
| 238 | Stories from The Shetland Witch: In Achaea & Mrs Sinclair and the Feather Haa | Kate Macdonald | 9781068696824 | The Peachfield Press, 2024 | – | [none](https://openlibrary.org/isbn/9781068696824) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 239 | Summer Story (Brambly Hedge) | Jill Barklem | 9780583333269 | 1999 | – | [none](https://openlibrary.org/isbn/9780583333269) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 240 | Summer Term At Malory Towers | Enid Blyton | 9781444948363 | Hodder Children's Books, 2018 | – | [none](https://openlibrary.org/books/OL43044775M) | check by hand | no page count recorded; Open Library has no page count for this ISBN |
| 241 | The Ambassador's Mission | Trudi Canavan | 9780316089258 | Orbit, 2010 | 238 | [none](https://openlibrary.org/books/OL24307933M) | check by hand | far from Open Library’s other editions of the book (about 513); Open Library has no page count for this ISBN |
| 242 | The Art of Discworld (GOLLANCZ S.F.) | Terry Pratchett | 9780575077126 | Gollancz, 2005 | 416 | [none](https://openlibrary.org/books/OL27307060M) | check by hand | far from Open Library’s other editions of the book (about 128); Open Library has no page count for this ISBN |
| 243 | The Callista Ascendancy | Steve Gay | 9781838217730 | – | – | [none](https://openlibrary.org/isbn/9781838217730) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 244 | The Quest for Qieta | Dr T. Wu | 9781739529703 | – | – | [none](https://openlibrary.org/isbn/9781739529703) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 245 | The Rough Guide to Japan: Travel Guide with eBook (Rough Guides Main Series) | Rough Guides | 9781839059797 | Rough Guides, 2024 | – | [848](https://openlibrary.org/books/OL51051327M) | 848 | no page count recorded |
| 246 | The School That Went to Sea | Martin Waddell | 9780744526035 | The O'Brien Press, 1993 | 336 | [none](https://openlibrary.org/books/OL15493948M) | check by hand | far from Open Library’s other editions of the book (about 25); Open Library has no page count for this ISBN |
| 247 | The Second Form At Malory Towers | Enid Blyton | 9781444948301 | Hodder Children's Books, 2018 | – | [none](https://openlibrary.org/books/OL48584629M) | check by hand | no page count recorded; Open Library has no page count for this ISBN (other editions of the book: about 160) |
| 248 | The Secret Seven Short Story Collection | Enid Blyton | 9781444912111 | 1997 | 320 | [none](https://openlibrary.org/books/OL33865568M) | check by hand | far from Open Library’s other editions of the book (about 133); Open Library has no page count for this ISBN |
| 249 | The Shetland Witch: Or, Atropos Wants Her Shears Back | Kate Macdonald | 9781068696800 | Peachfield Press, 2024 | – | [none](https://openlibrary.org/isbn/9781068696800) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 250 | The Sisterhood 2: The Second Summer of the Sisterhood | Ann Brashares | 9780375890246 | Delacorte Press, 2003 | 40 | [none](https://openlibrary.org/books/OL24283025M) | check by hand | far from Open Library’s other editions of the book (about 373); Open Library has no page count for this ISBN |
| 251 | The Subtle Knife | Philip Pullman | 9780590112895 | Scholastic | – | [none](https://openlibrary.org/books/OL39795605M) | check by hand | no page count recorded; Open Library has no page count for this ISBN (other editions of the book: about 350) |
| 252 | Turtles All the Way Down | John Green | 9780141346045 | Penguin Books, Limited, 2018 | 128 | [none](https://openlibrary.org/books/OL27351628M) | check by hand | far from Open Library’s other editions of the book (about 304); Open Library has no page count for this ISBN |
| 253 | Uglies | Scott Westerfeld | 9781471123948 | Simon & Schuster, 2014 | – | [none](https://openlibrary.org/books/OL32150224M) | check by hand | no page count recorded; Open Library has no page count for this ISBN (other editions of the book: about 432) |
| 254 | Unseen: How I Lost My Vision But Found My Voice | Molly Burke | 9798899731945 | – | – | [none](https://openlibrary.org/isbn/9798899731945) | check by hand | no page count recorded; this ISBN isn’t on Open Library |
| 255 | Where In The Zoo Are You? | – | – | 1996 | 36 | none | check by hand | under 48 pages on unsorted (not a picture book shelf) |
| 256 | Winter Term At Malory Towers | Enid Blyton | 9781444948370 | Hodder Children's Books, 2018 | – | [none](https://openlibrary.org/books/OL44003560M) | check by hand | no page count recorded; Open Library has no page count for this ISBN (other editions of the book: about 224) |
| 257 | You Are Here: The Instant Number 1 Sunday Times Bestseller, from the Author of One Day | David Nicholls | 9781444715460 | Sceptre, 2025 | – | [none](https://openlibrary.org/books/OL33864023M) | check by hand | no page count recorded; Open Library has no page count for this ISBN (other editions of the book: about 349) |

Machine-readable copy for applying her answers: `page-counts-to-check.json` (same numbers).
