import { AI_MODES, PRODUCT_VERSION, SECTION_TYPES, SUPPORTED_ARCHETYPES } from './contracts.js';
import { getDefaultTheme } from './defaults.js';

export function prepareSiteProject(manifestInput, siteInput) {
  if (!manifestInput || typeof manifestInput !== 'object') {
    throw new Error('Expected a project manifest object.');
  }

  if (!siteInput || typeof siteInput !== 'object') {
    throw new Error('Expected a site content object.');
  }

  if (manifestInput.version !== PRODUCT_VERSION) {
    throw new Error(
      `Unsupported project version "${manifestInput.version}". Expected ${PRODUCT_VERSION}.`
    );
  }

  if (!SUPPORTED_ARCHETYPES.includes(manifestInput.archetype)) {
    throw new Error(
      `Unsupported archetype "${manifestInput.archetype}". Expected one of: ${SUPPORTED_ARCHETYPES.join(', ')}.`
    );
  }

  const aiMode = manifestInput.features?.aiMode ?? 'guided';
  if (!AI_MODES.includes(aiMode)) {
    throw new Error(`Unsupported AI mode "${aiMode}".`);
  }

  if (!Array.isArray(siteInput.pages) || siteInput.pages.length === 0) {
    throw new Error('Site content must contain at least one page.');
  }

  const theme = mergeTheme(manifestInput.theme);
  const profile = {
    name: siteInput.profile?.name || manifestInput.name,
    handle: siteInput.profile?.handle || `@${manifestInput.slug}`,
    bio: siteInput.profile?.bio || manifestInput.seo?.description || '',
    avatar: siteInput.profile?.avatar || '',
    location: siteInput.profile?.location || '',
    availability: siteInput.profile?.availability || '',
  };

  const pages = siteInput.pages.map((page, index) => normalizePage(page, index, profile.name));
  const homePage = pages.find((page) => page.slug === '') ?? pages[0];
  const navigation = pages.map((page) => ({
    label: page.navLabel || page.title,
    href: page.slug ? `/${page.slug}/` : '/',
    currentKey: page.slug || 'home',
  }));

  return {
    manifest: {
      ...manifestInput,
      theme,
      features: {
        structuredEditing: manifestInput.features?.structuredEditing ?? true,
        exportable: manifestInput.features?.exportable ?? true,
        aiMode,
        advancedAiToggle: manifestInput.features?.advancedAiToggle ?? false,
      },
    },
    profile,
    pages,
    homePage,
    navigation,
  };
}

function mergeTheme(themeInput = {}) {
  const defaults = getDefaultTheme();

  return {
    ...defaults,
    ...themeInput,
    colors: {
      ...defaults.colors,
      ...(themeInput.colors ?? {}),
    },
    fontEmbedUrl: themeInput.fontEmbedUrl || defaults.fontEmbedUrl,
    displayFont: themeInput.displayFont || defaults.displayFont,
    bodyFont: themeInput.bodyFont || defaults.bodyFont,
  };
}

function normalizePage(page, index, fallbackName) {
  if (!page || typeof page !== 'object') {
    throw new Error(`Page at index ${index} must be an object.`);
  }

  const slug = typeof page.slug === 'string' ? page.slug.replace(/^\/|\/$/g, '') : '';
  const title = page.title || (index === 0 ? 'Home' : `Page ${index + 1}`);

  return {
    slug,
    title,
    navLabel: page.navLabel || title,
    description: page.description || '',
    hero: {
      eyebrow: page.hero?.eyebrow || '',
      title: page.hero?.title || fallbackName,
      subtitle: page.hero?.subtitle || '',
      kicker: page.hero?.kicker || '',
      primaryCta: normalizeButton(page.hero?.primaryCta),
      secondaryCta: normalizeButton(page.hero?.secondaryCta),
    },
    sections: normalizeSections(page.sections || []),
  };
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) {
    throw new Error('Page sections must be an array.');
  }

  return sections.map((section, index) => {
    if (!section || typeof section !== 'object') {
      throw new Error(`Section at index ${index} must be an object.`);
    }

    if (!SECTION_TYPES.includes(section.type)) {
      throw new Error(
        `Unsupported section type "${section.type}" at index ${index}. Expected one of: ${SECTION_TYPES.join(', ')}.`
      );
    }

    return {
      anchor: section.anchor || '',
      title: section.title || '',
      body: section.body || '',
      type: section.type,
      button: normalizeButton(section.button),
      items: Array.isArray(section.items)
        ? section.items.map((item) => ({
            ...item,
            label: item.label || item.title || 'Untitled',
            href: item.href || '',
            description: item.description || '',
            eyebrow: item.eyebrow || '',
            meta: item.meta || '',
          }))
        : [],
    };
  });
}

function normalizeButton(button) {
  if (!button || typeof button !== 'object' || !button.label || !button.href) {
    return null;
  }

  return {
    label: button.label,
    href: button.href,
  };
}
