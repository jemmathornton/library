Cover straightening tests (overnight 1-2 Nov 2026)

What: tools/straighten.py (the "Cropped or at an angle" button on Add a Book) was rebuilt and tested on AbeBooks UK
sellers' pictures of books whose right cover is already on the site (site/covers/<isbn>.jpg).

Rebuild a test set (one request a second; about 20 minutes; photos are not kept in git):
    python -X utf8 build_testset.py 120          -> testset/<isbn>/true.jpg + photo-N.jpg
Score:
    python -X utf8 bench.py method_app [--sheet out.jpg]      (TESTSET=testset2 for another folder)

Results (2 Nov):
                         flat covers left alone   real photos better / worse
  last night's version   46 of 150 (102 worse)    35 / 27
  now (tuning set)       159 of 159               19 / 0
  now (books not seen)   150 of 150               26 / 0

Tried and left out: edge-line search (document-scanner style; cover art beats the book's edges), judging each side by
its own colour (method_sides.py: +2 better, +2 worse on new books), turning by the slope of the lettering (tilt.py:
right to within 1 degree when sure, but the photos that need it mostly have table showing too).
Known misses: two books in one photo; a white cover photographed on white; a book filling the photo with thin strips
of table round it (her Child of the Grove AbeBooks photo) is left alone.
