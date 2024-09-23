export type SiteConfig = {
  name: string;
  description: string;
  navItems: NavItems;
  navMenuItems: NavItems;
  links: NavItems;
};

type NavItems = { [label: string]: string };

export const siteConfig: SiteConfig = {
  name: 'AHS "Jenkins" Scribe',
  description:
    "Record patient conversations and use Generative AI to create draft notes.",
  navItems: {},
  navMenuItems: {},
  links: {},
};
