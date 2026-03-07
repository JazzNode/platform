#!/bin/bash
sed -i '' 's/Date.now() \+ 7 \* 24 \* 60 \* 60 \* 1000/new Date().getTime() + 7 * 24 * 60 * 60 * 1000/g' src/app/\[locale\]/page.tsx
sed -i '' 's/Date.now() \+ 7 \* 24 \* 60 \* 60 \* 1000/new Date().getTime() + 7 * 24 * 60 * 60 * 1000/g' src/app/\[locale\]/venues/\[slug\]/page.tsx
