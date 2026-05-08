export type Lang = 'de' | 'en';

export const SUPPORTED_LANGS: readonly Lang[] = ['de', 'en'] as const;
export const DEFAULT_LANG: Lang = 'de';

export const ALT_LANG: Record<Lang, Lang> = {
  de: 'en',
  en: 'de',
};

export const PATH_FOR_LANG: Record<Lang, string> = {
  de: '/',
  en: '/en/',
};

export const HREFLANG: Record<Lang, string> = {
  de: 'de',
  en: 'en',
};

type SectionLabel = { num: string; text: string };
type EmString = { before: string; em: string; after?: string };

export interface Strings {
  meta: { title: string; description: string };
  nav: {
    platform: string;
    how: string;
    sites: string;
    pricing: string;
    faq: string;
    openConsole: string;
    signIn: string;
    ariaLangSwitch: string;
    ariaThemeToggle: string;
    themeLight: string;
    themeDark: string;
  };
  hero: {
    titleLines: string[];
    titleEm: string;
    titleTail: string;
    lede: EmString;
    ctaPrimary: string;
    ctaGhost: string;
    scroll: string;
    meta: { num: string; em?: boolean; label: string }[];
  };
  features: {
    label: SectionLabel;
    heading: EmString;
    sub: string;
    structure: { label: string; heading: EmString; body: string };
    versions: { label: string; heading: string; body: string };
    domains: { label: string; heading: string; body: string };
    deploys: { label: string; heading: string; body: string };
    console: { label: string; heading: string; body: string };
    also: { label: string; items: string[]; cta: string };
  };
  flow: {
    label: SectionLabel;
    heading: EmString;
    sub: string;
    steps: { heading: string; body: string }[];
    editor: {
      title: EmString;
      dek: string;
      labelTitle: string;
      labelDek: string;
      labelTags: string;
      tags: string;
      saved: string;
      publish: string;
      tabs: { overview: string; edit: string; revisions: string; deploy: string };
    };
  };
  showcase: {
    label: SectionLabel;
    heading: EmString;
    sub: string;
    live: string;
  };
  pricing: {
    label: SectionLabel;
    heading: EmString;
    sub: string;
    perMonth: string;
    duringPreview: string;
    personal: { name: string; desc: string; items: string[]; cta: string };
    studio: { name: string; desc: string; items: string[]; cta: string };
  };
  faq: {
    label: SectionLabel;
    heading: string;
    items: { q: string; a: string }[];
  };
  cta: {
    heading: EmString;
    body: string;
    placeholder: string;
    cta: string;
    note: string;
    onList: string;
    aria: string;
  };
  footer: {
    brandTag: string;
    headings: { platform: string; learn: string; elsewhere: string };
    links: {
      features: string;
      how: string;
      pricing: string;
      sites: string;
      docs: string;
      guides: string;
      changelog: string;
      faq: string;
      status: string;
      github: string;
      mastodon: string;
      contact: string;
    };
    copyright: string;
    ecoBefore: string;
    ecoName: string;
    ecoAfter: string;
    build: string;
  };
}

const de: Strings = {
  meta: {
    title: 'Porvi, eine versionierte Heimat im Web',
    description:
      'Porvi ist eine Plattform für persönliche Seiten, gebaut um strukturierte Inhalte, versioniertes Veröffentlichen und portable statische Ausgabe.',
  },
  nav: {
    platform: 'Plattform',
    how: 'Ablauf',
    sites: 'Seiten',
    pricing: 'Preise',
    faq: 'Fragen',
    openConsole: 'Konsole öffnen',
    signIn: 'Anmelden',
    ariaLangSwitch: 'Sprache wechseln',
    ariaThemeToggle: 'Farbschema umschalten',
    themeLight: 'Helles Thema',
    themeDark: 'Dunkles Thema',
  },
  hero: {
    titleLines: ['Deine eigene'],
    titleEm: 'Webpräsenz,',
    titleTail: ' versioniert und unter deiner Domain.',
    lede: {
      before:
        'Porvi ist eine Plattform für persönliche Seiten, gebaut um strukturierte Inhalte, saubere Revisionen und portable statische Ausgabe. Du schreibst in einer echten Konsole, jede Veröffentlichung ist eine nummerierte Revision, und deine Seite läuft auf ',
      em: 'deiner',
      after: ' Domain, nicht auf einem Pfad unter unserer.',
    },
    ctaPrimary: 'Frühen Zugang anfragen',
    ctaGhost: 'Wie das funktioniert',
    scroll: 'Scrollen',
    meta: [
      { num: 'Strukturiert', label: 'Inhalt mit Form' },
      { num: 'Versioniert', em: true, label: 'Jede Veröffentlichung bleibt' },
      { num: 'Deine Domain', label: 'Zertifikate inklusive' },
      { num: 'Portabel', label: 'Statische Ausgabe, dir gehört sie' },
    ],
  },
  features: {
    label: { num: '01', text: 'Plattform' },
    heading: {
      before: 'Ein Studio für die Seite, ',
      em: 'zu der du immer zurückkehrst',
      after: ', kein CMS, gegen das du kämpfst.',
    },
    sub: 'Porvi gibt dir eine Konsole für Struktur, Revisionen, Domains und Veröffentlichung. Sie hält sich raus und hinterlässt eine klare Spur, wenn du eine brauchst.',
    structure: {
      label: 'Struktur',
      heading: { before: 'Inhalt, der ', em: 'weiß, was er ist.' },
      body: 'Modelliere deine Seite einmal: Beiträge, Projekte, Essays, Seiten, und bearbeite sie in der Konsole gegen diese Form. Jedes Feld ist typisiert, jede Änderung wird verfolgt, jede Vorschau ist ehrlich.',
    },
    versions: {
      label: 'Versionen',
      heading: 'Jede Veröffentlichung ist eine nummerierte Revision.',
      body: 'Nichts verschwindet. Jede Veröffentlichung wird zu einer benannten Revision, die du diffen, vergleichen oder mit einem Klick zurückrollen kannst. Entwürfe leben neben Produktion, ohne sie zu stören.',
    },
    domains: {
      label: 'Domains',
      heading: 'Deine Domain, kein Unterpfad.',
      body: 'Setze einen CNAME oder einen A-Record. Porvi stellt das Zertifikat bereit, kümmert sich um den Edge und liefert deine Seite unter deinem eigenen Namen aus.',
    },
    deploys: {
      label: 'Deploys',
      heading: 'Veröffentlichen. Schauen. Live.',
      body: 'Ein nüchternes Build-Log und ein einzelner Live-Status. Porvi liefert ein statisches Bündel unter deiner Domain in Sekunden, nichts Dramatisches, nichts zu konfigurieren.',
    },
    console: {
      label: 'Konsole',
      heading: 'Eine Sitzung, alle Seiten.',
      body: 'Einmal anmelden. Deine Identität als Autor folgt jeder Seite, die du besitzt oder mitbearbeitest, keine Konten pro Projekt, keine Sitzplatz-Mathematik.',
    },
    also: {
      label: 'Außerdem dabei',
      items: [
        'Vorschau-Branches',
        'Markdown & MDX',
        'Formular-Endpunkte',
        'Zugriffskontrolle',
        'Ehrliche Statistik',
      ],
      cta: 'Den Ablauf sehen →',
    },
  },
  flow: {
    label: { num: '02', text: 'Ablauf' },
    heading: {
      before: 'Vom strukturierten Eintrag zur ',
      em: 'statischen Ausgabe',
      after: ', ohne Drumherum.',
    },
    sub: 'Schreibe in der Porvi-Konsole (oder in deinem eigenen Repo). Veröffentliche als nummerierte Revision. Porvi baut, versioniert und liefert ein statisches Bündel unter deiner Domain. Das ist die ganze Pipeline.',
    steps: [
      {
        heading: 'Mit Struktur schreiben',
        body: 'Schreibe gegen ein typisiertes Inhaltsmodell. Felder, Sammlungen und Verknüpfungen bleiben über jede Seite konsistent, in der Konsole oder direkt aus deinem Editor.',
      },
      {
        heading: 'Als Revision veröffentlichen',
        body: 'Jede Veröffentlichung ist eine nummerierte Revision in einer lesbaren Historie. Vergleichen, gegen die Live-Version prüfen oder zurückrollen. Der Verlauf bleibt bei der Seite, nicht im Terminal-Scrollback.',
      },
      {
        heading: 'Auf deiner Domain ausliefern',
        body: 'Porvi rendert statische Ausgabe, stellt Zertifikate bereit und liefert sie auf deiner Domain vom Edge. Das Artefakt ist ein portables statisches Bündel. Wenn du gehst, kommt es mit.',
      },
    ],
    editor: {
      title: { before: 'Ein leiser ', em: 'Almanach', after: ' für den Frühling.' },
      dek: 'Notizen über Licht, Wetter und die kleinen Rituale, nach dunklen Monaten wieder Dinge zu machen. In Fraunces gesetzt.',
      labelTitle: 'Titel',
      labelDek: 'Untertitel',
      labelTags: 'Tags',
      tags: 'essay · saisonal · editorial',
      saved: 'Entwurf gespeichert · vor 2s',
      publish: 'Als v.04 veröffentlichen',
      tabs: {
        overview: 'Übersicht',
        edit: 'Bearbeiten',
        revisions: 'Revisionen',
        deploy: 'Deploy',
      },
    },
  },
  showcase: {
    label: { num: '03', text: 'In der Welt' },
    heading: { before: 'Ein paar ', em: 'Seiten', after: ' auf Porvi.' },
    sub: 'Jede für sich: andere Typografie, anderer Rhythmus, andere Stimme. Gleiche strukturierte Bearbeitung und versionierte Veröffentlichung darunter.',
    live: 'Live',
  },
  pricing: {
    label: { num: '04', text: 'Preise' },
    heading: { before: 'Direkt, wie der ', em: 'Rest auch.' },
    sub: 'Aktuell ist Porvi einladungsbasiert. Es gibt keinen festen Preiskatalog: kleine Seiten starten frei, größere oder betreute Projekte bekommen ein individuelles Angebot.',
    perMonth: 'ab ca. 1 EUR / Person / Monat',
    duringPreview: 'aktuell nur mit Einladung',
    personal: {
      name: 'Free',
      desc: 'Für frühe persönliche Seiten und kleine Projekte, solange Porvi noch kuratiert wächst.',
      items: [
        'Einladung erforderlich',
        'Persönliche Seite oder kleines Projekt',
        'Eigene Domains, Zertifikate inklusive',
        'Versioniertes Veröffentlichen',
        'Konsole & Repo-Authoring',
      ],
      cta: 'Zugang anfragen',
    },
    studio: {
      name: 'Custom',
      desc: 'Für größere Seiten, Teams, betreute Setups oder besondere Anforderungen. Der Preis richtet sich nach Seite, Umfang und Betrieb.',
      items: [
        'Startet bei etwa 1 EUR pro Person und Monat',
        'Individuelles Setup je Seite',
        'Private Repositories',
        'Vorschau-Branch-Zugriffskontrolle',
        'Betrieb, Domains und Veröffentlichung nach Bedarf',
      ],
      cta: 'Angebot anfragen',
    },
  },
  faq: {
    label: { num: '05', text: 'Ehrliche Antworten' },
    heading: 'Fragen, in der Reihenfolge, in der sie gestellt werden.',
    items: [
      {
        q: 'Was ist Porvi, genau?',
        a: 'Porvi ist eine Plattform für persönliche Seiten. Du schreibst mit strukturierten Inhalten in einer echten Konsole (oder aus deinem eigenen Repo), jede Veröffentlichung wird zu einer nummerierten Revision in einer lesbaren Historie, und deine Seite wird als statische Ausgabe auf deiner Domain ausgeliefert. Das Artefakt ist portabel. Wenn du gehst, kommt es mit.',
      },
      {
        q: 'Ist das nur ein Static-Site-Generator mit angeschraubtem CMS?',
        a: 'Nicht ganz. Porvi verwaltet die ganze Schleife: strukturierte Inhalte, Revisionen, Deploys und Domains, mit statischer Ausgabe als Artefakt. Es ist die Plattform um das Bündel herum, nicht nur das, was es produziert.',
      },
      {
        q: 'Kann ich mein eigenes Repository nutzen?',
        a: 'Ja. Externe Site-Repositories sind das normale Modell. Porvi kann aus deinem Repo lesen (öffentlich oder privat) und von dort veröffentlichen, oder du schreibst direkt in der Konsole. Beide arbeiten gegen dasselbe Inhaltsmodell.',
      },
      {
        q: 'Was ist mit eigenen Domains, gibt es einen Haken?',
        a: 'Keinen. Setze einen CNAME (oder einen A-Record für die Apex) und Porvi stellt das Zertifikat bereit. Deine Domain bleibt deine; die Produktion läuft nie über eine Subdomain von uns.',
      },
      {
        q: 'Wie funktionieren Versionen und Rollbacks?',
        a: 'Jede Veröffentlichung ist eine nummerierte Revision: v.01, v.02, v.03, bei der Seite selbst gehalten. Du kannst Revisionen vergleichen, ansehen was sich geändert hat, und mit einer Aktion auf jede frühere zurückrollen. Die Live-Seite ist immer eine dieser nummerierten Revisionen.',
      },
      {
        q: 'Kann ich mit meinen Daten gehen?',
        a: 'Jederzeit. Strukturierte Inhalte sind exportierbar. Deploys sind statische Bündel, die du überall spiegeln kannst. Dein Repo und deine Domain bleiben bei dir. Porvi ist der Kleber, nicht der Vermieter.',
      },
    ],
  },
  cta: {
    heading: { before: 'Ein Zuhause im Web beginnen, ', em: 'eines, das bleibt.' },
    body: 'Porvi ist in privater Vorschau. Lass deine E-Mail da, wir teilen Zugang, sobald Plätze frei werden. Eine Nachricht, wenn es Platz gibt, sonst nichts.',
    placeholder: 'du@domain.tld',
    cta: 'Zugang anfragen',
    note: 'Private Vorschau · eine E-Mail, wenn ein Platz frei wird.',
    onList: 'Auf der Liste ✓',
    aria: 'E-Mail-Adresse',
  },
  footer: {
    brandTag:
      'Eine versionierte Heimat im Web: strukturierte Bearbeitung, saubere Revisionen, portable statische Ausgabe, deine eigene Domain.',
    headings: { platform: 'Plattform', learn: 'Lernen', elsewhere: 'Anderswo' },
    links: {
      features: 'Funktionen',
      how: 'Ablauf',
      pricing: 'Preise',
      sites: 'Seiten',
      docs: 'Dokumentation',
      guides: 'Anleitungen',
      changelog: 'Changelog',
      faq: 'Fragen',
      status: 'Status',
      github: 'GitHub',
      mastodon: 'Mastodon',
      contact: 'Kontakt',
    },
    copyright: '© 2026 · Porvi · Private Vorschau',
    ecoBefore: 'Teil des ',
    ecoName: 'kylehub',
    ecoAfter: ' Ökosystems',
    build: 'v1.0.0 · gebaut auf Astro',
  },
};

const en: Strings = {
  meta: {
    title: 'Porvi, a versioned home on the web',
    description:
      'Porvi is a creator-site platform built around structured content, versioned publishing, and portable static output. Your personal web presence, kept in revisions and served on your own domain.',
  },
  nav: {
    platform: 'Platform',
    how: 'How it works',
    sites: 'Sites',
    pricing: 'Pricing',
    faq: 'FAQ',
    openConsole: 'Open console',
    signIn: 'Sign in',
    ariaLangSwitch: 'Switch language',
    ariaThemeToggle: 'Toggle color theme',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
  },
  hero: {
    titleLines: ['Your personal', 'web presence,'],
    titleEm: 'versioned,',
    titleTail: ' and yours to keep.',
    lede: {
      before:
        'Porvi is a creator-site platform built around structured content, clean revisions, and portable static output. You write in a real console, each publish is a numbered revision, and your site is served on ',
      em: 'your',
      after: ' domain, not a subpath of ours.',
    },
    ctaPrimary: 'Request early access',
    ctaGhost: 'See how it works',
    scroll: 'Scroll',
    meta: [
      { num: 'Structured', label: 'Content with a shape' },
      { num: 'Versioned', em: true, label: 'Every publish, kept' },
      { num: 'Your domain', label: 'Certs handled for you' },
      { num: 'Portable', label: 'Static output, yours' },
    ],
  },
  features: {
    label: { num: '01', text: 'Platform' },
    heading: {
      before: 'A studio for the ',
      em: 'site you keep coming back to',
      after: ', not a CMS you fight with.',
    },
    sub: 'Porvi gives you one console for structure, revisions, domains, and deployments. It stays out of the way, and leaves a clear trail when you need one.',
    structure: {
      label: 'Structure',
      heading: { before: 'Content that ', em: 'knows what it is.' },
      body: 'Model your site once: posts, projects, essays, pages, and edit against that shape in the console. Every field is typed, every change is tracked, every preview is honest.',
    },
    versions: {
      label: 'Versions',
      heading: 'Every publish is a numbered revision.',
      body: 'Nothing disappears. Each publish becomes a named revision you can diff, compare, or roll back to in a single click. Drafts live alongside production without stepping on it.',
    },
    domains: {
      label: 'Domains',
      heading: 'Your domain, not a subpath.',
      body: 'Point a CNAME or A record. Porvi provisions the certificate, handles the edge, and serves your site from your own name.',
    },
    deploys: {
      label: 'Deploys',
      heading: 'Publish. Watch. Live.',
      body: 'A plain build log and a single live status. Porvi ships a static bundle under your domain in seconds, nothing dramatic, nothing to configure.',
    },
    console: {
      label: 'Console',
      heading: 'One session, every site.',
      body: 'Sign in once. Your author identity follows every site you own or contribute to, no per-project accounts, no seat math.',
    },
    also: {
      label: 'Also included',
      items: [
        'Preview branches',
        'Markdown & MDX',
        'Form endpoints',
        'Access control',
        'Honest analytics',
      ],
      cta: 'See the flow →',
    },
  },
  flow: {
    label: { num: '02', text: 'Flow' },
    heading: {
      before: 'From structured edit to ',
      em: 'static output',
      after: ', without ceremony.',
    },
    sub: 'Write in the Porvi console (or in your own repo). Publish as a numbered revision. Porvi builds, versions, and serves a static bundle under your domain. That is the whole pipeline.',
    steps: [
      {
        heading: 'Author with structure',
        body: 'Write against a typed content model. Fields, collections, and links stay consistent across every page your site renders, in the console, or straight from your editor.',
      },
      {
        heading: 'Publish as a revision',
        body: 'Each publish is a numbered revision in a readable history. Review, compare against the live version, or roll back. The record stays with the site, not in a terminal scrollback.',
      },
      {
        heading: 'Serve on your domain',
        body: 'Porvi renders static output, provisions certs, and serves it on your own domain from the edge. The artifact is a portable static bundle. If you ever leave, it comes with you.',
      },
    ],
    editor: {
      title: { before: 'A quiet ', em: 'almanac', after: ' for the spring.' },
      dek: 'Notes on light, weather, and the small rituals of making things again after the dark months. Typeset in Fraunces.',
      labelTitle: 'Title',
      labelDek: 'Dek',
      labelTags: 'Tags',
      tags: 'essay · seasonal · editorial',
      saved: 'draft saved · 2s ago',
      publish: 'Publish as v.04',
      tabs: {
        overview: 'Overview',
        edit: 'Edit',
        revisions: 'Revisions',
        deploy: 'Deploy',
      },
    },
  },
  showcase: {
    label: { num: '03', text: 'In the wild' },
    heading: { before: 'A few ', em: 'sites', after: ' kept on Porvi.' },
    sub: 'Each one is its own project: different typography, different rhythm, different voice. Same structured editing and versioned publishing underneath.',
    live: 'Live',
  },
  pricing: {
    label: { num: '04', text: 'Plans' },
    heading: { before: 'Direct, like the ', em: 'rest of it.' },
    sub: 'Porvi is currently invite-only. There is no fixed price sheet: small sites can start free, and larger or supported projects get custom pricing.',
    perMonth: 'from about EUR 1 / person / month',
    duringPreview: 'currently invite-only',
    personal: {
      name: 'Free',
      desc: 'For early personal sites and small projects while Porvi grows through curated access.',
      items: [
        'Invite required',
        'Personal sites and small projects',
        'Custom domains, certs included',
        'Versioned publishing',
        'Console & repo authoring',
      ],
      cta: 'Request access',
    },
    studio: {
      name: 'Custom',
      desc: 'For larger sites, teams, supported setups, or specific requirements. Pricing depends on the page, scope, and operating needs.',
      items: [
        'Starts around EUR 1 per person per month',
        'Site-specific setup',
        'Private repositories',
        'Preview-branch access control',
        'Operations, domains, and publishing as needed',
      ],
      cta: 'Request a quote',
    },
  },
  faq: {
    label: { num: '05', text: 'Honest answers' },
    heading: 'Questions, in the order people ask them.',
    items: [
      {
        q: 'What is Porvi, exactly?',
        a: 'Porvi is a creator-site platform. You author with structured content in a real console (or from your own repo), each publish becomes a numbered revision in a readable history, and your site is served as static output on your own domain. The artifact is portable. If you ever leave, it comes with you.',
      },
      {
        q: 'Is this just a static site generator with a CMS bolted on?',
        a: 'Not quite. Porvi manages the full loop: structured content, revisions, deploys, and domains, with static output as the artifact. It is the platform around the bundle, not just the thing that produces it.',
      },
      {
        q: 'Can I use my own repository?',
        a: 'Yes. External site repositories are the normal model. Porvi can read from your repo (public or private) and publish from there, or you can author directly in the console. The two work against the same content model.',
      },
      {
        q: 'What about custom domains, any catch?',
        a: 'None. Point a CNAME (or an A record for apex) and Porvi provisions the certificate. Your domain stays yours; production never routes through a subdomain of ours.',
      },
      {
        q: 'How do versions and rollbacks work?',
        a: 'Every publish is a numbered revision: v.01, v.02, v.03, kept with the site itself. You can compare revisions, inspect what changed, and roll back to any previous one with a single action. The live site is always one of those numbered revisions.',
      },
      {
        q: 'Can I leave with my data?',
        a: 'Anytime. Structured content is exportable. Deploys are static bundles you can mirror anywhere. Your repo and your domain stay with you. Porvi is the glue, not the landlord.',
      },
    ],
  },
  cta: {
    heading: { before: 'Start a home on the web, ', em: "one you'll keep." },
    body: "Porvi is in private preview. Leave your email and we'll share access as slots open. One message when there's room, nothing else.",
    placeholder: 'you@domain.tld',
    cta: 'Request access',
    note: 'Private preview · one email when a spot opens.',
    onList: 'On the list ✓',
    aria: 'Email address',
  },
  footer: {
    brandTag:
      'A versioned home on the web: structured editing, clean revisions, portable static output, your own domain.',
    headings: { platform: 'Platform', learn: 'Learn', elsewhere: 'Elsewhere' },
    links: {
      features: 'Features',
      how: 'How it works',
      pricing: 'Pricing',
      sites: 'Sites',
      docs: 'Docs',
      guides: 'Guides',
      changelog: 'Changelog',
      faq: 'FAQ',
      status: 'Status',
      github: 'GitHub',
      mastodon: 'Mastodon',
      contact: 'Contact',
    },
    copyright: '© 2026 · Porvi · Private preview',
    ecoBefore: 'Part of the ',
    ecoName: 'kylehub',
    ecoAfter: ' ecosystem',
    build: 'v1.0.0 · built on Astro',
  },
};

const TABLE: Record<Lang, Strings> = { de, en };

export function getStrings(lang: Lang): Strings {
  return TABLE[lang];
}
