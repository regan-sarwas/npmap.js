import os
import json
mine = set()
o = json.load(open('index.json','r'))
for i in os.listdir('.'):
  if i.endswith('.js'):
    # print i,
    k = i.replace('.js','')
    mine.add(k)
    found = False
    for e in o:
      if e['id'] == k:
        # print 'found'
        found = True
        break
    if not found:
      print i, ' not found in index.json'

for e in o:
	if e['id'] in mine:
		continue
	print e['id'], '.js not in file system'
