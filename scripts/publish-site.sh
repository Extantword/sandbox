#!/usr/bin/env bash
#
# Build the deck and publish it to https://extantword.github.io/sandbox/
#
# The source is the repository's main branch; what is served is the build, pushed on its own to
# the gh-pages branch each time, with no history kept there.
set -euo pipefail

deck=$(cd "$(dirname "$0")/.." && pwd)
cd "$deck"
npm run build
touch dist/.nojekyll

remote=$(git remote get-url origin)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Las diapositivas, al día"
git push -q -f "$remote" gh-pages
rm -rf .git
echo "published: https://extantword.github.io/sandbox/"
