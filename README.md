# ArchiTECH website

[architechdesign.in](https://architechdesign.in/) is the shared entry to [ArchiTECH Design](https://architechdesign.in/design/) and [ArchiTECH Automation](https://architechdesign.in/automation/).

- `portal.html` and `portal.css` make up the homepage. Legacy Design section links open the corresponding section under `/design/`.
- `index.html` is the Design division's residence presentation. It is based on the selected `hesa-residence` site at commit `a60f9f3ec8c14638a2de2cce24642770db7e129d` of `architech97/architech-portfolio`. It uses Three.js, GSAP and Lenis from jsDelivr.
- `automation.ref` pins the public [Automation repository](https://github.com/architech97/architech-plugins). To publish a newer revision, update the pin to its full commit SHA.

GitHub Actions builds Automation with `BASE=/automation/` and assembles both divisions for GitHub Pages. For a local preview, build Automation with the same base, then run:

```sh
node scripts/assemble-site.mjs ../architech-plugins/dist _site
```

Serve `_site` at the root of a static HTTP server. Use a fresh output directory for each assembly.

## Adding a Design project

`index.html` is the featured case study (the Vasant Kunj residence) and the project grid. It is published at `/design/`.

1. Create `projects/<slug>/index.html`. It is published at `/design/<slug>/`.
2. Copy the case-study block from `index.html` and fill in project, location, status, role, software, scope (modelling, BIM, renders), process images and outcome. State only what is true for that project, and say when images are visualisations.
3. Add a card to the project grid in `index.html` linking to `/design/<slug>/`.

`projects/slot-02/` and `projects/slot-03/` are empty placeholders. They are marked `noindex` and are not added to the sitemap. Replace a slot only when Navneet supplies a hero render, a brief, the scope, the software, process or before/after images, and an outcome. Do not invent a client name.

`privacy/index.html` is a draft notice for Navneet to review. It is published at `/privacy/`.
