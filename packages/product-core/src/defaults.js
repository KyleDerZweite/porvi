import { AI_MODES, PRODUCT_VERSION, SUPPORTED_ARCHETYPES } from './contracts.js';

const DEFAULT_THEME = {
  fontEmbedUrl:
    'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Outfit:wght@300;400;500;600;700&display=swap',
  displayFont: "'Fraunces', 'Georgia', serif",
  bodyFont: "'Outfit', 'Helvetica Neue', sans-serif",
  colors: {
    bg: '#f6f0e8',
    bgWarm: '#ece3d6',
    surface: '#fcf8f4',
    text: '#241f1d',
    textMuted: '#6f6761',
    accent: '#bd6f4d',
    accentSoft: '#dbc1b2',
    border: '#d8cfc6',
    borderStrong: '#bcae9e',
  },
};

const ARCHETYPE_COPY = {
  'link-hub': {
    title: 'Your links, but with an actual point of view.',
    subtitle:
      'A creator home that stays light, fast, and portable while feeling more custom than a generic link page.',
    sectionTitle: 'Everything important',
  },
  portfolio: {
    title: 'Selected work and the taste behind it.',
    subtitle:
      'A portfolio site for creators and builders who need projects, context, and a contact path in one place.',
    sectionTitle: 'Featured work',
  },
  'creator-site': {
    title: 'A digital home that can grow past a single page.',
    subtitle:
      'Start with a strong landing page and add story, media, and collaboration pages without changing platforms.',
    sectionTitle: 'Core sections',
  },
};

export function createStarterProject({
  name,
  slug,
  archetype = 'link-hub',
  description,
}) {
  if (!SUPPORTED_ARCHETYPES.includes(archetype)) {
    throw new Error(
      `Unsupported archetype "${archetype}". Expected one of: ${SUPPORTED_ARCHETYPES.join(', ')}.`
    );
  }

  const safeSlug = slug.trim().toLowerCase();
  const copy = ARCHETYPE_COPY[archetype];

  const manifest = {
    version: PRODUCT_VERSION,
    siteId: safeSlug,
    name,
    slug: safeSlug,
    archetype,
    deployment: {
      subdomain: safeSlug,
      customDomains: [],
    },
    features: {
      structuredEditing: true,
      exportable: true,
      aiMode: AI_MODES[1],
      advancedAiToggle: false,
    },
    seo: {
      title: `${name} | Creator site`,
      description:
        description ??
        `${name} uses Porvi for a custom static website with structured editing and guided AI changes.`,
    },
    theme: getDefaultTheme(),
  };

  const heroTitles = {
    'link-hub': `${name}'s links, but with an actual point of view.`,
    portfolio: `Selected work and the taste behind ${name}.`,
    'creator-site': `A digital home for ${name} that can grow past a single page.`,
  };

  const pages = [
    {
      slug: '',
      title: 'Home',
      navLabel: 'Home',
      description: manifest.seo.description,
      hero: {
        eyebrow: archetype === 'link-hub' ? 'Creator link hub' : 'Creator website',
        title: heroTitles[archetype],
        subtitle: description ?? copy.subtitle,
        kicker: archetype === 'portfolio' ? 'For collaborators, clients, and curious people.' : '',
        primaryCta: {
          label: archetype === 'portfolio' ? 'Start a project' : 'Open primary link',
          href: 'mailto:hello@example.com',
        },
        secondaryCta: {
          label: 'See all links',
          href: '#links',
        },
      },
      sections: buildSectionsForArchetype(archetype, name),
    },
  ];

  if (archetype === 'creator-site') {
    pages.push(
      {
        slug: 'about',
        title: 'About',
        navLabel: 'About',
        description: `About ${name}`,
        hero: {
          eyebrow: 'Origin story',
          title: `What ${name} is building`,
          subtitle:
            'Use this page for long-form context, your tone, and the story that does not fit into a one-screen landing page.',
        },
        sections: [
          {
            type: 'text',
            title: 'Backstory',
            body:
              'Write a sharper long-form narrative here. This is the page where personality, positioning, and differentiators should become obvious.',
          },
          {
            type: 'cta',
            title: 'Open the next conversation',
            body: 'Move visitors from curiosity to contact with a specific invitation.',
            button: {
              label: 'Contact',
              href: 'mailto:hello@example.com',
            },
          },
        ],
      },
      {
        slug: 'contact',
        title: 'Contact',
        navLabel: 'Contact',
        description: `Contact ${name}`,
        hero: {
          eyebrow: 'Collaboration',
          title: 'Get in touch',
          subtitle:
            'Use this page for booking details, response expectations, rates, or collaboration preferences.',
        },
        sections: [
          {
            type: 'links',
            title: 'Reach out',
            items: [
              {
                label: 'Email',
                href: 'mailto:hello@example.com',
                description: 'Best for business inquiries and collaborations.',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/example',
                description: 'Useful if your community is already there.',
              },
            ],
          },
        ],
      }
    );
  }

  const site = {
    profile: {
      name,
      handle: `@${safeSlug}`,
      bio:
        description ??
        'Replace this with a short, specific positioning line. It should sound like a person, not a template.',
      avatar: '',
      location: '',
      availability:
        archetype === 'portfolio' ? 'Open for selected projects' : 'Open for collaborations',
    },
    pages,
  };

  return { manifest, site };
}

function buildSectionsForArchetype(archetype, name) {
  if (archetype === 'portfolio') {
    return [
      {
        type: 'featured',
        title: 'Featured work',
        items: [
          {
            title: 'Project One',
            eyebrow: 'Case study',
            description: 'Summarize the result, not just the deliverable.',
            href: '#',
          },
          {
            title: 'Project Two',
            eyebrow: 'Launch',
            description: 'Use concrete language about the audience and outcome.',
            href: '#',
          },
        ],
      },
      {
        type: 'text',
        title: `Why ${name}`,
        body:
          'Use this section to explain taste, process, and what kind of work you want more of. This is where differentiation starts to feel credible.',
      },
      {
        type: 'links',
        title: 'Elsewhere',
        items: [
          {
            label: 'GitHub',
            href: 'https://github.com',
            description: 'Code, experiments, and work in public.',
          },
          {
            label: 'Email',
            href: 'mailto:hello@example.com',
            description: 'Direct contact for serious inquiries.',
          },
        ],
      },
    ];
  }

  const baseSections = [
    {
      type: 'links',
      title: 'Everything important',
      anchor: 'links',
      items: [
        {
          label: 'Primary platform',
          href: 'https://example.com',
          description: 'Make this the one action you care about most.',
        },
        {
          label: 'Discord',
          href: 'https://discord.gg/example',
          description: 'Community, updates, and direct conversation.',
        },
        {
          label: 'Instagram',
          href: 'https://instagram.com',
          description: 'The visual feed and lightweight updates.',
        },
      ],
    },
    {
      type: 'text',
      title: 'What this site is for',
      body:
        'Use this space to explain the current focus of your work, stream, or community. Keep it specific enough that visitors know why they should stay.',
    },
  ];

  if (archetype === 'creator-site') {
    return [
      ...baseSections,
      {
        type: 'featured',
        title: 'Current highlights',
        items: [
          {
            title: 'Lore / story arc',
            eyebrow: 'Worldbuilding',
            description: 'Good fit for VTubers, artists, and creators with recurring narrative hooks.',
            href: '/about',
          },
          {
            title: 'Bookings and contact',
            eyebrow: 'Business',
            description: 'Give brand partners and collaborators a clean path.',
            href: '/contact',
          },
        ],
      },
    ];
  }

  return baseSections;
}

export function getDefaultTheme() {
  return structuredClone(DEFAULT_THEME);
}
