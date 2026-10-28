import json, os, re
H = r'C:\Users\Jemma\Documents\HomeLibrary\data'
books = json.load(open(os.path.join(H, 'books.json'), encoding='utf8')) + json.load(open(os.path.join(H, 'added.json'), encoding='utf8'))
nf = json.load(open(os.path.join(H, 'name-fixes.json'), encoding='utf8'))
print('books keys:', list(nf['books'])[:40]); print('surnames', nf['surnames'], 'titles', nf.get('titles'))
pats = ['Catcher', 'Practical Railway', 'Flying Sorcerers', 'Invasion Day', 'Malory Towers', "St Clare", "St. Clare", 'Power That Preserves', 'Big Java', 'DK', 'Eyewitness', 'Invisible Cities', 'Wild Boar', 'Gloamglozer', 'Last of the Sky Pirates', 'Travelers', 'Madame Bovary', 'Theodore Boone', 'Foundation', 'Restaurant at the End', 'Incompetence', 'Supernaturalist', 'Only You Can Save', 'Bookseller', 'Seven Kinds', 'Kyoto', 'Tiny Moons', 'Positively Birmingham', 'Best in Travel', 'Ballet Shoes', 'White Boots', 'Holes', 'Worry Website', 'Airman', 'Half-Moon', 'Zombie Survival', 'Edge Chronicles', 'Beyond the Deepwoods', 'Stormchaser', 'Ptolemy', 'Eragon', 'Pure Dead', 'Murderbot', 'All Systems Red', 'Crepsley', 'Traitor Spy', 'Ambassador', 'Fever Crumb', 'Winter', 'Autumn', 'Castaways', 'Mortal Engines', 'Lirael', 'Artemis Fowl']
for b in books:
    if any(p.lower() in b['title'].lower() for p in pats) or any(p in a['name'] for a in b.get('authors', []) for p in ['Dorling', 'DK', 'Morgan', 'Cox']):
        print(b['id'], '|', b['title'][:60], '|', b['shelf'], '|', [(a['name'], a.get('role')) for a in b.get('authors', [])], '|', b.get('isbn13'))
