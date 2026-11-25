// Every piece of copy on the home page lives here. Edit text in this file, not in the components.

export const owner = {
  name: 'Georgio Abi Aad',
  first: 'Georgio',
  initials: 'GA',
  role: 'Full-stack software engineer',
  roleLine: 'Full-stack software engineer · Web, .NET & cloud',
  promise: 'Software that feels alive.',
  intro: 'Web apps, .NET and desktop systems, APIs and the infrastructure behind them, finished with interfaces people remember.',
  upworkUrl: 'https://www.upwork.com/freelancers/~01d09e8e7c1f809bab',
  email: 'georgioabiaad@gmail.com',
  // Set to an image path in public/ (e.g. 'img/georgio.jpg') once a photo exists.
  photo: null,
};

// Real, shipped engineering work. Shown before the concept demos.
export const cases = [
  {
    id: 'crewbay',
    kicker: 'Product · Desktop app',
    title: 'Crewbay',
    summary: 'A Windows desktop app that turns live AI coding-agent activity into an animated office you can watch, replay and control.',
    role: 'Product, engineering and release',
    points: [
      'Node.js server reading local logs in real time and linking every agent, command and service to whatever started it',
      'Electron desktop build with installer, tray and automatic updates',
      'Licensing and billing service for the Pro tier',
      'Scenario test suite and replay tooling for release testing',
    ],
    stack: ['Node.js', 'Electron', 'JavaScript', 'Automated tests'],
    accent: '#d5f591',
  },
  {
    id: 'hardware',
    kicker: 'Engineering · Desktop & native',
    title: 'Hardware test software',
    summary: 'Engineering and production applications that configure and test hardware devices.',
    role: 'Software engineer',
    points: [
      'C# / WPF applications used on engineering and production lines',
      'Managed-to-native bridges between .NET and C/C++ hardware libraries',
      'Automated tests, debugging and refactoring for long-term reliability',
    ],
    stack: ['C#', '.NET', 'WPF', 'C / C++'],
    accent: '#a9c8ff',
  },
  {
    id: 'devops',
    kicker: 'DevOps · Cloud-native',
    title: 'Microservice delivery',
    summary: 'Deployment and automation for a microservice platform across Linux virtual machines.',
    role: 'DevOps engineer',
    points: [
      'Microservices and databases on Docker and Kubernetes, with load balancing and high availability',
      'Helm charts to standardise deployments',
      'Azure DevOps pipelines automating test, build and deploy',
    ],
    stack: ['Docker', 'Kubernetes', 'Helm', 'Azure DevOps'],
    accent: '#78cfac',
  },
];

// Concept demos, in display order. `slug` is the folder in public/.
export const demos = [
  { slug: '10-restaurant', title: 'Restaurant', label: 'A taste of your business', benefit: 'Bring your atmosphere online and make planning a visit effortless.', tags: ['Scroll film', 'Menu', 'Reservations'], tech: 'Inline SVG · Native scroll', light: '#e8a54b', base: '#1b120c' },
  { slug: '02-living-backgrounds', title: 'Living Backgrounds', label: 'Brand & atmosphere', benefit: 'A memorable first impression that responds to your visitors.', tags: ['Shaders', 'Live canvas', 'Cursor'], tech: 'WebGL shaders · Touch-reactive', light: '#c7fc78', base: '#0a0f0a' },
  { slug: '08-ops-worlds', title: 'Ops Worlds', label: 'Systems, made tangible', benefit: 'Explain complex operations through a world people can explore.', tags: ['3D simulation', 'Process', 'Live controls'], tech: 'three.js · Adaptive quality', light: '#a9c8ff', base: '#0a1022' },
  { slug: '07-iso-worlds', title: 'Iso Worlds', label: 'A world worth exploring', benefit: 'Give visitors a hands-on way to explore your space or service.', tags: ['Isometric 3D', 'Maps', 'Spatial UI'], tech: 'three.js · Adaptive quality', light: '#e9cf8f', base: '#14130f' },
  { slug: '09-saas-landing', title: 'SaaS Landing', label: 'From product to promise', benefit: 'Explain your product clearly and guide visitors toward a trial.', tags: ['Landing page', 'Motion', 'Responsive'], tech: 'Canvas 2D · Adaptive density', light: '#c6ff63', base: '#070906' },
  { slug: '11-ecommerce', title: 'E-commerce Product Page', label: 'From discovery to desire', benefit: 'Product pages that make people want to buy.', tags: ['3D product', 'Cart', 'Checkout'], tech: 'three.js · Purchase journey', light: '#d8c9ae', base: '#15110f' },
  { slug: '04-playful-auth', title: 'Playful Auth', label: 'Small moments, big feeling', benefit: 'Give everyday sign-ins a little personality and clear feedback.', tags: ['Forms', 'Micro-animation', 'Feedback'], tech: 'Canvas particles · Reduced motion', light: '#4fd6c2', base: '#06201f' },
  { slug: '05-dashboards', title: 'Dashboards', label: 'Data with direction', benefit: 'Make complex information easier to understand and act on.', tags: ['Data viz', 'Charts', 'Transitions'], tech: 'SVG charts · Local persistence', light: '#b8f0cf', base: '#0b1a12' },
  { slug: '03-editorial', title: 'Editorial', label: 'Content & character', benefit: 'Turn your brand’s story into a page people want to read.', tags: ['Typography', 'Scroll reveals', 'Art direction'], tech: 'Canvas 2D · Reduced motion', light: '#e3b679', base: '#141414' },
  { slug: '01-scroll-story', title: 'Scroll Story', label: 'Scroll & story', benefit: 'Product launches that tell a story as you scroll.', tags: ['3D scenes', 'Choreography', 'Camera'], tech: 'three.js · Native scroll', light: '#f0a6c0', base: '#160c14' },
  { slug: '06-node-networks', title: 'Node Networks', label: 'Make connections visible', benefit: 'Show how your product, people or ideas connect at a glance.', tags: ['Particles', 'Graphs', 'Canvas'], tech: 'Canvas 2D · Paused off-screen', light: '#ff4fb3', base: '#07060b' },
];

export const services = [
  {
    title: 'Web apps & websites',
    text: 'Full-stack web applications, dashboards and websites, from the data model to an interface people remember.',
    deliverables: ['Responsive front-end', 'APIs & database', 'Auth & admin panel', 'Hosting & domain setup'],
    stack: 'JavaScript · Node.js · three.js · GSAP',
  },
  {
    title: '.NET & desktop systems',
    text: 'C# and WPF applications for engineering and production, including bridges to native C/C++ libraries that drive hardware.',
    deliverables: ['WPF / desktop apps', 'C/C++ interop', 'Refactoring & tests', 'Installers & updates'],
    stack: 'C# · .NET · WPF · C / C++',
  },
  {
    title: 'Backends, APIs & data',
    text: 'Services, authentication, integrations and databases designed to stay reliable and easy to extend.',
    deliverables: ['REST APIs', 'Integrations', 'MySQL / MongoDB', 'Background jobs'],
    stack: 'Node.js · REST · MySQL · MongoDB',
  },
  {
    title: 'DevOps & delivery',
    text: 'Containers, orchestration and CI/CD pipelines that test, build and deploy your software automatically.',
    deliverables: ['Docker & Kubernetes', 'Helm charts', 'CI/CD pipelines', 'Monitoring basics'],
    stack: 'Docker · Kubernetes · Helm · Azure DevOps',
  },
];

export const steps = [
  { title: 'Discover & architect', text: 'Understand the problem, agree on scope, and plan the architecture, data and design. You get a fixed quote split into milestones.' },
  { title: 'Build & test', text: 'Ship in small, previewable steps with automated tests and clean, maintainable code. You review a live link after every milestone.' },
  { title: 'Deploy & support', text: 'Set up CI/CD and hosting, polish across devices, and stay around after launch.' },
];

export const faq = [
  { q: 'Do you work fixed-price or hourly?', a: 'Both. Most projects are a fixed price split into milestones, so you know the total up front and only release payment as each part is delivered. Open-ended or ongoing work can be hourly.' },
  { q: 'Can you work with my existing code or stack?', a: 'Yes. A lot of my work is extending, refactoring and stabilising existing systems, from web apps to C#/.NET desktop software. I read the code first and suggest the smallest safe change.' },
  { q: 'Do I own the code?', a: 'Yes. You receive the full source code, any 3D or design source files, and the documentation needed to run and deploy it.' },
  { q: 'What happens after launch?', a: 'Every project can include a support period after launch for fixes and small changes, agreed in the quote. Longer-term maintenance can continue hourly or on a retainer.' },
  { q: 'How do we start?', a: 'Send a message on Upwork or by email with what you want to build. I reply with questions, a plan and a quote. Hiring through Upwork keeps payments protected for both of us.' },
];
