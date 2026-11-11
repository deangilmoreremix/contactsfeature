# Vendored code from twenty-shared

Files in this directory are copied from the `twenty-shared` package of
https://github.com/twentyhq/twenty (fork: deangilmoreremix/twenty @ 4cfe8d3b),
`packages/twenty-shared/src`, which is licensed under the MIT License.

Changes made when vendoring (file bodies are otherwise unmodified):
- `@/…` path-alias and barrel (`index.ts`) imports were rewritten to direct
  relative file imports so only the needed files are included.
- `from 'zod/v4'` was changed to `from 'zod/v4'` (zod 3.25 ships v4 under that path).

Do not add files marked `/* @license Enterprise */` (commercial) or any code
from the AGPLv3 `twenty-front` / `twenty-server` packages here.

---

MIT License

Copyright (c) 2023-present Twenty.com, PBC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
