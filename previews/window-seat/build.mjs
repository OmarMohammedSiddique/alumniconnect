import fs from 'node:fs/promises';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const from = new URL('./tailwind.input.css', import.meta.url).pathname;
const result = await postcss([tailwind({ optimize: true })]).process(await fs.readFile(from, 'utf8'), { from });
await fs.writeFile(new URL('./tailwind.css', import.meta.url), result.css);
